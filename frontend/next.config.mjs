/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Required for onnxruntime-web WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }

    // Required for canvas (drei dependency) on server
    config.externals = [...(config.externals || []), { canvas: 'canvas' }]

    // Prevent onnxruntime-web from being bundled server-side
    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-web']
    }

    return config
  },
  transpilePackages: ['three'],
}

export default nextConfig
