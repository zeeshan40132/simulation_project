import './globals.css'

export const metadata = {
  title: 'Hospital ER Simulation',
  description: 'Emergency Room Discrete-Event Simulation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
