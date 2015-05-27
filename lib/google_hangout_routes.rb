module MindMup
  module GoogleHangoutRoutes
    get '/google_hangouts' do
      if (production?) then
        content_type 'text/xml'
      end
      erb :google_hangouts
    end
  end
end
