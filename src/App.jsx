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

  // Check if deadline is within 14 days
  const isDeadlineSoon = (dateString) => {
    if (!dateString) return false
    const deadline = new Date(dateString)
    const now = new Date()
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    return daysUntil <= 14 && daysUntil >= 0
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
    if (!amount) return null
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date as DD MMM YYYY
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Format last updated timestamp
  const formatLastUpdated = (date) => {
    if (!date) return ''
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get date range of results
  const getDateRange = () => {
    if (tenders.length === 0) return ''
    const dates = tenders.map(t => new Date(t.date)).filter(d => !isNaN(d))
    if (dates.length === 0) return ''
    const oldest = new Date(Math.min(...dates))
    const newest = new Date(Math.max(...dates))
    return `${formatDate(oldest)} - ${formatDate(newest)}`
  }

  // Truncate description
  const truncateDescription = (text, maxLength = 200) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className="App">
      {/* HEADER SECTION */}
      <header className="header">
        <div className="header-content">
          <h1 className="main-title">Sirona Care and Health - BNSSG Tender Opportunities</h1>
          <p className="subtitle">
            Showing tenders matching: <span className="search-terms">BNSSG, Bristol NHS, Bristol ICB</span>
          </p>

          <div className="header-controls">
            <div className="last-updated-info">
              {lastUpdated && (
                <>
                  <svg className="clock-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Last Updated: {formatLastUpdated(lastUpdated)}</span>
                </>
              )}
            </div>
            <button
              onClick={() => fetchTenders(true)}
              disabled={loading}
              className="refresh-button"
            >
              <svg className={`refresh-icon ${loading ? 'spinning' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* ERROR STATE */}
        {error && (
          <div className="error-state">
            <svg className="error-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3>Error Loading Tenders</h3>
            <p>{error}</p>
            <button onClick={() => fetchTenders(true)} className="retry-button">
              Try Again
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && tenders.length === 0 && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p className="loading-text">Fetching latest BNSSG tender opportunities...</p>
          </div>
        )}

        {/* SUMMARY STATS BAR */}
        {!loading && tenders.length > 0 && (
          <div className="stats-bar">
            <div className="stat-item">
              <svg className="stat-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="stat-content">
                <span className="stat-value">{tenders.length}</span>
                <span className="stat-label">Active Tender{tenders.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="stat-item">
              <svg className="stat-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="stat-content">
                <span className="stat-value">Last 30 Days</span>
                <span className="stat-label">{getDateRange()}</span>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && tenders.length === 0 && !error && (
          <div className="empty-state">
            <svg className="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>No Tenders Found</h3>
            <p>No BNSSG-related tenders found in the last 30 days. Check back soon!</p>
          </div>
        )}

        {/* TENDER CARDS */}
        {!loading && tenders.length > 0 && (
          <div className="tenders-grid">
            {tenders.map((release) => {
              const deadline = release.tender?.tenderPeriod?.endDate
              const deadlineSoon = isDeadlineSoon(deadline)
              const value = release.tender?.value?.amount
              const currency = release.tender?.value?.currency || 'GBP'

              return (
                <article key={release.ocid} className="tender-card">
                  {/* Deadline badge */}
                  {deadline && deadlineSoon && (
                    <div className="deadline-badge urgent">
                      <svg className="badge-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Deadline Soon
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="tender-title">{release.tender?.title || 'Untitled Tender'}</h2>

                  {/* Organization */}
                  <div className="tender-organization">
                    <svg className="org-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="org-name">{release.buyer?.name || 'Not specified'}</span>
                  </div>

                  {/* Notice ID */}
                  <div className="notice-id">Notice ID: {release.id}</div>

                  {/* Description */}
                  {release.tender?.description && (
                    <div className="tender-description">
                      <p>{truncateDescription(release.tender.description, 200)}</p>
                      {release.tender.description.length > 200 && (
                        <span className="read-more">Read more...</span>
                      )}
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="tender-metadata">
                    {value && (
                      <div className="metadata-item value">
                        <svg className="metadata-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <span className="metadata-label">Value</span>
                          <span className="metadata-value">{formatCurrency(value, currency)}</span>
                        </div>
                      </div>
                    )}

                    {deadline && (
                      <div className={`metadata-item deadline ${deadlineSoon ? 'urgent' : ''}`}>
                        <svg className="metadata-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <span className="metadata-label">Deadline</span>
                          <span className="metadata-value">{formatDate(deadline)}</span>
                        </div>
                      </div>
                    )}

                    <div className="metadata-item published">
                      <svg className="metadata-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <span className="metadata-label">Published</span>
                        <span className="metadata-value">{formatDate(release.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* View tender button */}
                  <a
                    href={`https://www.find-tender.service.gov.uk/Notice/${release.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-tender-button"
                  >
                    View Full Tender
                    <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
