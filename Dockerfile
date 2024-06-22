FROM public.ecr.aws/sorah/ruby:3.3-dev

RUN mkdir /app
WORKDIR /app
ADD Gemfile /app/Gemfile
ADD Gemfile.lock /app/Gemfile.lock
RUN bundle install
COPY . /app

CMD ["bundle", "exec", "thin", "-R", "config.ru", "-a", "0.0.0.0", "-p", "9292", "start"]
