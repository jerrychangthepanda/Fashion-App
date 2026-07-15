/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
    },
    images: {
        remotePatterns: [
            {
                // Post photos and profile pictures, uploaded to
                // Supabase Storage and served from its public bucket
                // URLs (both "post-images" and "profile_picture"
                // buckets share this same host + path prefix).
                protocol: "https",
                hostname: "lmgggdbcrcbjlsdtlbqx.supabase.co",
                pathname: "/storage/v1/object/public/**",
            },
            {
                // Album artwork from Apple's iTunes Search API. The
                // subdomain (is1-ssl, is2-ssl, ...) varies per
                // request and isn't predictable, so this wildcards
                // just that one label.
                protocol: "https",
                hostname: "*.mzstatic.com",
            },
        ],
    },
};

module.exports = nextConfig;