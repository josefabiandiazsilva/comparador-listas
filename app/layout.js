import './globals.css'

export const metadata = {
  title: 'Comparador MOODLE vs SIGA',
  description: 'Compara listados de estudiantes entre MOODLE y SIGA de forma inteligente',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
