module MindMup
  module GoogleHangoutRoutes
    get '/google_hangouts' do
      content_type 'text/xml'
      erb :google_hangouts
    end
    get '/hangout-picker' do
      erb :hangout_picker
    end
  end
end
