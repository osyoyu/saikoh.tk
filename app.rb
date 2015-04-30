require 'sinatra'
require 'sinatra-websocket'
require 'redis'
require 'json'

class Button
  def initialize(name, label, count = 0)
    count = (count ? count.to_i : 0)

    @name  = name
    @label = label
    @count = count
  end

  def incr
    @count += 1
    redis_save(self)
  end

  def reset
    @count = 0
  end

  attr_reader :name, :label, :count
end

def values
  result = settings.buttons.map { |button| { name: button.name, label: button.label, count: button.count } }
  return result
end

def reset
  settings.button.each do |button|
    button.reset
  end
end

def redis_save(button)
  Redis.new.set(button.name, button.count)
end

configure do
  redis = Redis.new

  buttons = [
    # Button.new('ihou', '違法', redis.get('ihou')),
    Button.new('saikou', '最高', redis.get('saikou')),
    Button.new('emoi', 'エモい', redis.get('emoi')),
    Button.new('imagine_the_future', 'IMAGINE THE FUTURE.', redis.get('imagine_the_future')),
    Button.new('we_are_the_champions', 'We Are The Champions', redis.get('we_are_the_champions'))
  ]

  set :sockets, []
  set :buttons, buttons
end

get '/' do
  @keys = settings.buttons

  erb :index
end

get '/values' do
  return JSON.generate(values)
end

get '/ws/values' do
  halt 404 unless request.websocket?

  request.websocket do |ws|
    ws.onopen do
      settings.sockets.push(ws)
    end

    ws.onmessage do |msg|
    end

    ws.onclose do
      settings.sockets.delete(ws)
    end
  end
end

get '/click/:key' do
  key = params['key']

  button = settings.buttons.find {|button| button.name == key }
  halt 403 if button == nil

  button.incr

  settings.sockets.each do |socket|
    socket.send(JSON.generate(values))
  end

  return
end

get '/reset' do
  reset
  return
end
