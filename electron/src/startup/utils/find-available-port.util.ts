import { createServer } from 'node:net'

export const findAvailablePort = (host: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.unref()
    server.once('error', reject)
    server.listen(0, host, () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not determine the available backend port.'))
        return
      }

      const { port } = address

      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve(port)
      })
    })
  })
}
