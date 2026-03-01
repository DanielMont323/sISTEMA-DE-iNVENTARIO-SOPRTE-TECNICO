const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280'
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '16px'
  }
}

export default function Reportes() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Reportes</h1>
        <p style={styles.subtitle}>Estadísticas y análisis del inventario</p>
      </div>
      
      <div style={styles.card}>
        <p style={styles.message}>Módulo de Reportes</p>
        <p style={{fontSize: '14px', color: '#9ca3af'}}>
          Aquí podrás generar reportes, ver estadísticas y análisis del uso del inventario.
        </p>
      </div>
    </div>
  )
}
