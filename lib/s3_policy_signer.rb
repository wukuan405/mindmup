require 'base64'
require 'openssl'
require 'digest/sha1'
require 'cgi'

class S3PolicySigner
	# see http://aws.amazon.com/articles/1434/
	def signed_policy (aws_secret_key, key_id, bucket_name, upload_path, max_size, content_type, expiration_time)
		raise "aws key must be defined" if aws_secret_key.nil?

		# format as "2050-01-01T00:00:00Z"
		expiration=(Time.now+expiration_time).utc.strftime('%FT%TZ')

		policy_document=%Q!{"expiration": "#{expiration}", "conditions": [
		{"bucket": "#{bucket_name}"},
		["starts-with", "$key", "#{upload_path}"],
		{"acl": "public-read"},
		["eq","$Content-Type", "#{content_type}"],
		["content-length-range", 0, #{max_size}]
		]
		}!
		policy_document.gsub!(/\n|\t| /,'')
		policy = Base64.encode64(policy_document).gsub("\n","")
		signature = Base64.encode64(
			OpenSSL::HMAC.digest(
				OpenSSL::Digest::Digest.new('sha1'), 
				aws_secret_key, policy)
		).gsub("\n","")
		{policy: policy, signature: signature}
	end
  # see http://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html
  def signed_get aws_secret, bucket_name, get_path, expires_in_seconds

    expiration_time = Time.now+expires_in_seconds
		expiration=expiration_time.strftime('%s')
    string_to_sign = "GET\n\n\n#{expiration}\n/#{bucket_name}#{get_path}"
		signature = CGI.escape(Base64.encode64(
			OpenSSL::HMAC.digest(
				OpenSSL::Digest::Digest.new('sha1'), 
				aws_secret, string_to_sign)
		).gsub("\n","")).gsub("+","%2B")
    {signature: signature, expires: expiration}
  end
  def decode_xor_key xor_key, aws_secret
    xor4 aws_secret, Base64.decode64(xor_key)
  end
  def encode_secret_key user_secret, mm_aws_secret
    xor_key = xor4 mm_aws_secret, user_secret
    Base64.encode64(xor_key).gsub("\n","")
  end
  def xor4(first, second)
    s = []
    first.unpack('C*').zip(second.unpack('C*')) {|a,b| s.push( (a||0) ^ (b||0) ) }
    s.pack('C*')
  end
end
