require 'sinatra/base'
require 'sinatra-websocket'

require 'redis'
require 'redis-objects'
require 'connection_pool'

require 'json'

require_relative './button.rb'

class SaikohTk < Sinatra::Base
  configure do
    set :redis_url, ENV['REDIS_URL'] || 'redis://localhost:6379'

    Redis::Objects.redis = ConnectionPool.new(size: 5, timeout: 5) { Redis.new(url: settings.redis_url) }
  end

  helpers do
    def buttons
      Thread.current[:buttons] ||= {
        saikoh: Button.new(1, '最高', 'saikoh'),
        emoi:   Button.new(2, 'エモい', 'emoi'),
        imagine_the_future:   Button.new(3, 'IMAGINE THE FUTURE.', 'imagine-the-future'),
        we_are_the_champions: Button.new(4, 'We Are the Champions', 'we-are-the-champions')
      }
    end

    def incr_button(name)
      halt 400 unless buttons.has_key?(name)

      button = buttons[name]
      count = button.count.incr

      websockets.each do |ws|
        ws.send({
          type: 'update',
          data: {
            slug: name,
            value: count
          }
        }.to_json)
      end

      return count
    end

    def websockets
      Thread.current[:websockets] ||= []
    end

    def handle_message(message)
      case message[:type]
      when "incr"
        if message.dig(:data, :slug)
          button_slug = message.dig(:data, :slug).to_sym
          incr_button(button_slug) if buttons.has_key?(button_slug)
        end
      end
    end
  end

  #
  # Web endpoints
  #
  get '/' do
    @buttons = buttons

    slim :index
  end

  get '/:button/incr' do
    incr_button(params[:button].to_sym)

    redirect '/'
  end

  #
  # JSON APIs
  #
  get '/api/:button/incr' do
    incr_button(params[:button].to_sym)

    content_type :json
    button.to_json
  end

  #
  # WebSocket APIs
  # Hidden feature: When a WebSocket connection is established, a trailing '.'
  #                 will appear after 'IMAGINE THE FUTURE' !
  #
  get '/api/websocket' do
    return 404 unless request.websocket?

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
          return
        end

        handle_message(message)
      end
    end
  end
end
