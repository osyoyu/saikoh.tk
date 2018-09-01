FROM ubuntu:16.04

RUN apt-get update && apt-get install -y locales && locale-gen en_US.UTF-8

ENV LANG en_US.utf8
ENV LC_ALL en_US.UTF-8

RUN \
  apt-get install -y \
    build-essential zlib1g-dev libssl-dev libreadline-dev libyaml-dev libxml2-dev libxslt-dev \
    ruby2.3 ruby2.3-dev

RUN gem update --system && gem install bundler

RUN mkdir /app
WORKDIR /app
ADD Gemfile /app/Gemfile
ADD Gemfile.lock /app/Gemfile.lock
RUN bundle install
ADD . /app

EXPOSE 9292
CMD ["/usr/local/bin/rackup", "-o", "0.0.0.0", "-p", "3000"]
