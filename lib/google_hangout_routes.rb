module MindMup
  module GoogleHangoutRoutes
    get '/google_hangouts' do
      content_type 'text/xml'
      erb :google_hangouts
    end
  end
end
