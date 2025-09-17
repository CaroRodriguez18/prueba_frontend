const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      // Reenvía TODO lo que empiece por /api al backend de Django (puerto 8000)
      '^/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,           // por si usas websockets en otros endpoints
        // Estos dos ayudan a que SSE no se corte por timeout del proxy
        proxyTimeout: 0,
        timeout: 0,
        // Mantén viva la conexión (SSE)
        onProxyReq(proxyReq) {
          proxyReq.setHeader('Connection', 'keep-alive')
        },
      },
    },
  },
})
