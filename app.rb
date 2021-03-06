require 'sinatra/base'
require 'sinatra-websocket'

require 'redis'
require 'redis-objects'
require 'connection_pool'

require 'json'

require 'logger'

require_relative './counter.rb'

class SaikohTk < Sinatra::Base
  configure do
    set :redis_url, ENV['REDIS_URL'] || 'redis://localhost:6379'

    Redis::Objects.redis = ConnectionPool.new(size: 5, timeout: 5) { Redis.new(url: settings.redis_url) }
  end

  helpers do
    def counters
      Thread.current[:counters] ||= [
        Counter.new(1, 'saikoh', '最高'),
        Counter.new(2, 'emoi', 'エモい'),
        Counter.new(3, 'imagine_the_future', 'IMAGINE THE FUTURE'),
        Counter.new(4, 'we_are_the_champions', 'We Are the Champions')
      ]
    end

    def logger
      Dir.mkdir('log') unless Dir.exist?('log')
      Thread.current[:logger] ||= Logger.new('log/logfile.log')
    end

    def find_counter_by_name(name)
      counter = counters.find do |counter|
        counter.name.value == name
      end
    end

    def meta_description
      counters.map do |counter|
        "#{counter.label.value}: #{counter.count.value}"
      end.join(", ")
    end

    def incr_counter(counter)
      count = counter.count.incr

      data = {
        type: 'update',
        data: counter.as_json
      }.to_json

      websockets.each do |ws|
        ws.send(data)
      end

      log(counter.name, {
        ip: request.ip,
        user_agent: request.user_agent
      })

      return count
    end

    def log(event_type, host)
      timestamp = Time.now.to_f

      logger.info(JSON.generate({
        event: event_type,
        host: {
          ip: host[:ip],
          user_agent: host[:user_agent]
        }
      }))
    end

    def websockets
      Thread.current[:websockets] ||= []
    end

    def handle_message(message)
      case message[:type]
      when "incr"
        name = message.dig(:data, :name)
        counter = find_counter_by_name(name)
        incr_counter(counter) unless counter.nil?
      end
    end
  end

  #
  # Web endpoints
  #
  get '/' do
    @counters = counters

    slim :index
  end

  get '/:counter/incr' do
    counter = find_counter_by_name(params[:counter])
    halt 400 if counter.nil?

    incr_counter(counter)

    @counter = counter
    slim :play
  end

  #
  # JSON APIs
  #
  get '/api/counters' do
    content_type :json
    counters.map(&:to_json)
  end

  get '/api/:counter/show' do
    counter = find_counter_by_name(params[:counter])
    halt 400 if counter.nil?

    content_type :json
    counter.to_json
  end

  get '/api/:counter/incr' do
    counter = find_counter_by_name(params[:counter])
    halt 400 if counter.nil?

    incr_counter(counter)

    content_type :json
    counter.to_json
  end

  #
  # WebSocket APIs
  # Hidden feature: A trailing '.' will appear after 'ITF.' when a WebSocket connection is established!
  #
  get '/api/websocket' do
    halt 404 unless request.websocket?

    request.websocket do |ws|
      ws.onopen do
        websockets.push(ws)
      end

      ws.onclose do
        websockets.delete(ws)
      end

      ws.onmessage do |msg|
        begin
          message = JSON.parse(msg, symbolize_names: true)
        rescue JSON::ParserError => e
        end

        handle_message(message)
      end
    end
  end
end
