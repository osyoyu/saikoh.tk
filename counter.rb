# coding: UTF-8

require 'redis'
require 'redis-objects'
require 'connection_pool'

class Counter
  include Redis::Objects
  value :name
  value :label
  counter :count, start: 0

  def initialize(id, name, label)
    @id = id
    self.name.value = name
    self.label.value = label
  end

  def id
    @id
  end

  def as_json
    {
      name: self.name,
      label: self.label,
      count: self.count
    }
  end

  def to_json
    JSON.generate(self.as_json)
  end
end
