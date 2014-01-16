require 'base64'
require 'openssl'
require 'digest/sha1'

class S3PolicySigner
	# see http://aws.amazon.com/articles/1434/
	def signed_policy (aws_secret_key, key_id, bucket_name, upload_path, max_size, content_type, expiration_time, acl)
		raise "aws key must be defined" if aws_secret_key.nil?

		# format as "2050-01-01T00:00:00Z"
		expiration=(Time.now+expiration_time).utc.strftime('%FT%TZ')

		policy_document=%Q!{"expiration": "#{expiration}", "conditions": [
		{"bucket": "#{bucket_name}"},
		["starts-with", "$key", "#{upload_path}"],
    ["starts-with", "$acl", "#{acl}"],
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
		{policy: policy, signature: signature, aws_id: key_id, upload_path:upload_path, bucket_name: bucket_name, content_type: content_type}
	end
end
