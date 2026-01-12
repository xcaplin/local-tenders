import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [tenders, setTenders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Keywords to search for (case-insensitive)
  const SEARCH_KEYWORDS = [
    'BNSSG',
    'Bristol, North Somerset and South Gloucestershire',
    'NHS Bristol',
    'Bristol ICB'
  ]

  // Check if a tender matches our search criteria
  const matchesSearchCriteria = (release) => {
    const searchFields = [
      release.tender?.title || '',
      release.tender?.description || '',
      release.buyer?.name || '',
      ...(release.parties || []).map(p => p.name || ''),
      ...(release.parties || []).flatMap(p => {
        const addr = p.address || {}
        return [addr.streetAddress, addr.locality, addr.region, addr.postalCode, addr.countryName].filter(Boolean)
      })
    ]

    const searchText = searchFields.join(' ').toLowerCase()

    return SEARCH_KEYWORDS.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    )
  }

  // Format date to YYYY-MM-DDTHH:MM:SS
  const formatDateForAPI = (date) => {
    return date.toISOString().split('.')[0]
  }

  // Get date 30 days ago
  const getThirtyDaysAgo = () => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return formatDateForAPI(date)
  }

  // Fetch tenders from API
  const fetchTenders = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first (if not forcing refresh)
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('bnssg_tenders')
        const cachedTimestamp = localStorage.getItem('bnssg_tenders_timestamp')

        if (cachedData && cachedTimestamp) {
          const cacheAge = Date.now() - parseInt(cachedTimestamp)
          const oneHour = 60 * 60 * 1000

          if (cacheAge < oneHour) {
            // Use cached data
            const parsed = JSON.parse(cachedData)
            setTenders(parsed)
            setLastUpdated(new Date(parseInt(cachedTimestamp)))
            setLoading(false)
            return
          }
        }
      }

      // Build API URL
      const updatedFrom = getThirtyDaysAgo()
      const apiUrl = new URL('https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages')
      apiUrl.searchParams.append('stages', 'tender')
      apiUrl.searchParams.append('updatedFrom', updatedFrom)
      apiUrl.searchParams.append('limit', '100')

      console.log('Fetching from:', apiUrl.toString())

      const response = await fetch(apiUrl.toString())

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.')
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.releases || !Array.isArray(data.releases)) {
        throw new Error('Invalid API response format')
      }

      console.log(`Fetched ${data.releases.length} tenders from API`)

      // Filter for BNSSG-related tenders
      const filtered = data.releases.filter(matchesSearchCriteria)
      console.log(`Filtered to ${filtered.length} BNSSG-related tenders`)

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date))

      // Cache the results
      localStorage.setItem('bnssg_tenders', JSON.stringify(filtered))
      localStorage.setItem('bnssg_tenders_timestamp', Date.now().toString())

      setTenders(filtered)
      setLastUpdated(new Date())
      setError(null)

    } catch (err) {
      console.error('Error fetching tenders:', err)
      setError(err.message || 'Failed to fetch tenders')

      // Try to use cached data as fallback
      const cachedData = localStorage.getItem('bnssg_tenders')
      if (cachedData) {
        setTenders(JSON.parse(cachedData))
        const cachedTimestamp = localStorage.getItem('bnssg_tenders_timestamp')
        if (cachedTimestamp) {
          setLastUpdated(new Date(parseInt(cachedTimestamp)))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchTenders()
  }, [])

  // Format currency
  const formatCurrency = (amount, currency = 'GBP') => {
    if (!amount) return 'Not specified'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>BNSSG Local Tenders Dashboard</h1>
        <p className="subtitle">
          Bristol, North Somerset and South Gloucestershire NHS Tenders
        </p>

        <div className="controls">
          <button
            onClick={() => fetchTenders(true)}
            disabled={loading}
            className="refresh-button"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleString('en-GB')}
            </span>
          )}
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {loading && tenders.length === 0 ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading tenders...</p>
          </div>
        ) : (
          <div className="tenders-container">
            <div className="stats">
              <strong>{tenders.length}</strong> active tender{tenders.length !== 1 ? 's' : ''} found
            </div>

            {tenders.length === 0 && !loading ? (
              <div className="no-results">
                <p>No BNSSG-related tenders found in the last 30 days.</p>
                <p>Try refreshing or check back later.</p>
              </div>
            ) : (
              <div className="tenders-list">
                {tenders.map((release) => (
                  <div key={release.ocid} className="tender-card">
                    <div className="tender-header">
                      <h3>{release.tender?.title || 'Untitled Tender'}</h3>
                      <span className="tender-id">ID: {release.id}</span>
                    </div>

                    <div className="tender-meta">
                      <div className="meta-item">
                        <strong>Organization:</strong> {release.buyer?.name || 'Not specified'}
                      </div>
                      <div className="meta-item">
                        <strong>Published:</strong> {formatDate(release.date)}
                      </div>
                      {release.tender?.tenderPeriod?.endDate && (
                        <div className="meta-item deadline">
                          <strong>Deadline:</strong> {formatDate(release.tender.tenderPeriod.endDate)}
                        </div>
                      )}
                      {release.tender?.value?.amount && (
                        <div className="meta-item">
                          <strong>Value:</strong> {formatCurrency(
                            release.tender.value.amount,
                            release.tender.value.currency
                          )}
                        </div>
                      )}
                    </div>

                    {release.tender?.description && (
                      <div className="tender-description">
                        <p>{release.tender.description}</p>
                      </div>
                    )}

                    {release.parties && release.parties.length > 0 && (
                      <div className="tender-parties">
                        <strong>Involved parties:</strong>
                        <ul>
                          {release.parties.slice(0, 3).map((party, idx) => (
                            <li key={idx}>
                              {party.name}
                              {party.roles && ` (${party.roles.join(', ')})`}
                            </li>
                          ))}
                          {release.parties.length > 3 && (
                            <li className="more-parties">
                              ...and {release.parties.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="tender-footer">
                      <a
                        href={`https://www.find-tender.service.gov.uk/Notice/${release.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-tender-link"
                      >
                        View full tender →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  )
}

export default App
