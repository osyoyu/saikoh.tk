require 'redis'
require 'redis-objects'
require 'connection_pool'

class Button
  include Redis::Objects
  value :name
  value :slug
  counter :count, start: 0

  def initialize(id, name, slug)
    @id = id
    self.name.value = name
    self.slug.value = slug
  end

  def id
    @id
  end

  def to_json
    {
      name: self.name,
      slug: self.slug,
      count: self.count
    }.to_json
  end
end
