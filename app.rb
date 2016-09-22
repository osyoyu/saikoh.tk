require 'sinatra/base'

require 'redis'
require 'redis-objects'
require 'connection_pool'

require_relative './button.rb'

class SaikohTk < Sinatra::Base
  configure do
    set :redis_url, ENV['REDIS_URL'] || 'redis://localhost:6379'

    Redis::Objects.redis = ConnectionPool.new(size: 5, timeout: 5) { Redis.new }
  end

  helpers do
    def buttons
      Thread.current[:buttons] ||= {
        saikoh: Button.new(1, '最高', 'saikoh'),
        emoi:   Button.new(2, 'エモい', 'emoi'),
        imagine_the_future:   Button.new(3, 'IMAGINE THE FUTURE', 'imagine_the_future'),
        we_are_the_champions: Button.new(4, 'We Are the Champions', 'we_are_the_champions')
      }
    end
  end

  get '/' do
    @buttons = buttons

    slim :index
  end

  get '/:button/incr' do
    return 400 unless buttons.has_key?(params[:button].to_sym)

    button = buttons[params[:button].to_sym]
    button.count.incr

    redirect '/'
  end
end
