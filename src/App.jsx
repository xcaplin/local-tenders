import { useState, useEffect, useMemo } from 'react'
import './App.css'

function App() {
  const [tenders, setTenders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Filter and sort states
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [valueFilters, setValueFilters] = useState([])
  const [deadlineFilter, setDeadlineFilter] = useState('all')

  // Utility states
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(
    () => localStorage.getItem('emailNotifications') === 'true'
  )
  const [copiedId, setCopiedId] = useState(null)
  const [showToast, setShowToast] = useState(false)

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

  // Get days until deadline
  const getDaysUntilDeadline = (dateString) => {
    if (!dateString) return null
    const deadline = new Date(dateString)
    const now = new Date()
    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
  }

  // Check if tender matches value filter
  const matchesValueFilter = (release) => {
    if (valueFilters.length === 0) return true

    const amount = release.tender?.value?.amount

    if (!amount && valueFilters.includes('unknown')) return true
    if (!amount) return false

    if (valueFilters.includes('under50k') && amount < 50000) return true
    if (valueFilters.includes('50k-250k') && amount >= 50000 && amount < 250000) return true
    if (valueFilters.includes('250k-1m') && amount >= 250000 && amount < 1000000) return true
    if (valueFilters.includes('over1m') && amount >= 1000000) return true

    return false
  }

  // Check if tender matches deadline filter
  const matchesDeadlineFilter = (release) => {
    if (deadlineFilter === 'all') return true

    const deadline = release.tender?.tenderPeriod?.endDate
    if (!deadline) return false

    const daysUntil = getDaysUntilDeadline(deadline)
    if (daysUntil === null || daysUntil < 0) return false

    if (deadlineFilter === '7days' && daysUntil <= 7) return true
    if (deadlineFilter === '14days' && daysUntil <= 14) return true
    if (deadlineFilter === '30days' && daysUntil <= 30) return true

    return false
  }

  // Check if tender matches search query
  const matchesSearchQuery = (release) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const searchableText = [
      release.tender?.title || '',
      release.tender?.description || '',
      release.buyer?.name || ''
    ].join(' ').toLowerCase()

    return searchableText.includes(query)
  }

  // Filter and sort tenders
  const filteredAndSortedTenders = useMemo(() => {
    let result = [...tenders]

    // Apply search filter
    result = result.filter(matchesSearchQuery)

    // Apply value filter
    result = result.filter(matchesValueFilter)

    // Apply deadline filter
    result = result.filter(matchesDeadlineFilter)

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.date) - new Date(a.date)
      } else if (sortBy === 'deadline') {
        const aDeadline = a.tender?.tenderPeriod?.endDate
        const bDeadline = b.tender?.tenderPeriod?.endDate

        // Tenders without deadlines go to the end
        if (!aDeadline && !bDeadline) return 0
        if (!aDeadline) return 1
        if (!bDeadline) return -1

        return new Date(aDeadline) - new Date(bDeadline)
      } else if (sortBy === 'value') {
        const aValue = a.tender?.value?.amount || 0
        const bValue = b.tender?.value?.amount || 0
        return bValue - aValue
      }
      return 0
    })

    return result
  }, [tenders, searchQuery, valueFilters, deadlineFilter, sortBy])

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

  // Clear all filters
  const clearFilters = () => {
    setSortBy('newest')
    setSearchQuery('')
    setValueFilters([])
    setDeadlineFilter('all')
  }

  // Toggle value filter
  const toggleValueFilter = (filter) => {
    setValueFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  // Toggle email notifications
  const toggleEmailNotifications = () => {
    const newValue = !emailNotifications
    setEmailNotifications(newValue)
    localStorage.setItem('emailNotifications', newValue.toString())
  }

  // Export to CSV
  const exportToCSV = () => {
    const csvHeaders = ['Title', 'Organization', 'Notice ID', 'Value', 'Currency', 'Deadline', 'Published Date', 'Link']
    const csvRows = filteredAndSortedTenders.map(release => {
      const value = release.tender?.value?.amount || ''
      const currency = release.tender?.value?.currency || ''
      const deadline = release.tender?.tenderPeriod?.endDate || ''
      const link = `https://www.find-tender.service.gov.uk/Notice/${release.id}`

      return [
        `"${(release.tender?.title || 'Untitled').replace(/"/g, '""')}"`,
        `"${(release.buyer?.name || 'Not specified').replace(/"/g, '""')}"`,
        release.id,
        value,
        currency,
        deadline ? formatDate(deadline) : '',
        formatDate(release.date),
        link
      ].join(',')
    })

    const csv = [csvHeaders.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const today = new Date().toISOString().split('T')[0]

    link.setAttribute('href', url)
    link.setAttribute('download', `BNSSG_Tenders_${today}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Copy tender link to clipboard
  const copyTenderLink = async (tenderId) => {
    const link = `https://www.find-tender.service.gov.uk/Notice/${tenderId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(tenderId)
      setShowToast(true)
      setTimeout(() => {
        setCopiedId(null)
        setShowToast(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Print view
  const openPrintView = () => {
    window.print()
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

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== '' ||
                           valueFilters.length > 0 ||
                           deadlineFilter !== 'all' ||
                           sortBy !== 'newest'

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
            <div className="header-left-controls">
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

              {/* Email Notifications Toggle */}
              <label className="email-toggle">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={toggleEmailNotifications}
                />
                <svg className="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email Alerts</span>
              </label>
              {emailNotifications && (
                <span className="email-notice">Check back daily for new opportunities</span>
              )}
            </div>

            <div className="header-right-controls">
              {/* Help Button */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="icon-button help-button"
                title="Help & Information"
              >
                <svg className="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Export to CSV */}
              <button
                onClick={exportToCSV}
                disabled={filteredAndSortedTenders.length === 0}
                className="utility-button"
                title="Export to CSV"
              >
                <svg className="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>

              {/* Print View */}
              <button
                onClick={openPrintView}
                disabled={filteredAndSortedTenders.length === 0}
                className="utility-button"
                title="Print View"
              >
                <svg className="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>

              {/* Refresh Data */}
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
        </div>
      </header>

      {/* FILTER TOOLBAR */}
      <div className="filter-toolbar">
        <div className="toolbar-content">
          {/* Search Bar */}
          <div className="filter-section search-section">
            <label htmlFor="search" className="filter-label">
              <svg className="filter-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search tenders by title, description, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="filter-section">
            <label htmlFor="sort" className="filter-label">
              <svg className="filter-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort By
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="deadline">Deadline Soon</option>
              <option value="value">Highest Value</option>
            </select>
          </div>

          {/* Value Filters */}
          <div className="filter-section">
            <div className="filter-label">
              <svg className="filter-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Value Range
            </div>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={valueFilters.includes('under50k')}
                  onChange={() => toggleValueFilter('under50k')}
                />
                <span>Under £50k</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={valueFilters.includes('50k-250k')}
                  onChange={() => toggleValueFilter('50k-250k')}
                />
                <span>£50k - £250k</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={valueFilters.includes('250k-1m')}
                  onChange={() => toggleValueFilter('250k-1m')}
                />
                <span>£250k - £1M</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={valueFilters.includes('over1m')}
                  onChange={() => toggleValueFilter('over1m')}
                />
                <span>Over £1M</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={valueFilters.includes('unknown')}
                  onChange={() => toggleValueFilter('unknown')}
                />
                <span>Unknown/Not specified</span>
              </label>
            </div>
          </div>

          {/* Deadline Filters */}
          <div className="filter-section">
            <div className="filter-label">
              <svg className="filter-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Deadline
            </div>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="deadline"
                  checked={deadlineFilter === 'all'}
                  onChange={() => setDeadlineFilter('all')}
                />
                <span>All deadlines</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="deadline"
                  checked={deadlineFilter === '7days'}
                  onChange={() => setDeadlineFilter('7days')}
                />
                <span>Closing within 7 days</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="deadline"
                  checked={deadlineFilter === '14days'}
                  onChange={() => setDeadlineFilter('14days')}
                />
                <span>Closing within 14 days</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="deadline"
                  checked={deadlineFilter === '30days'}
                  onChange={() => setDeadlineFilter('30days')}
                />
                <span>Closing within 30 days</span>
              </label>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="filter-section">
              <button onClick={clearFilters} className="clear-filters-button">
                <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

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
                <span className="stat-value">{filteredAndSortedTenders.length}</span>
                <span className="stat-label">
                  {hasActiveFilters
                    ? `Showing ${filteredAndSortedTenders.length} of ${tenders.length} tenders`
                    : `Active Tender${tenders.length !== 1 ? 's' : ''}`
                  }
                </span>
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

        {/* NO RESULTS AFTER FILTERING */}
        {!loading && tenders.length > 0 && filteredAndSortedTenders.length === 0 && (
          <div className="empty-state">
            <svg className="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3>No Matching Tenders</h3>
            <p>No tenders match your current filters. Try adjusting your search criteria.</p>
            <button onClick={clearFilters} className="retry-button">
              Clear Filters
            </button>
          </div>
        )}

        {/* TENDER CARDS */}
        {!loading && filteredAndSortedTenders.length > 0 && (
          <div className="tenders-grid">
            {filteredAndSortedTenders.map((release) => {
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

                  {/* Action buttons */}
                  <div className="tender-actions">
                    <button
                      onClick={() => copyTenderLink(release.id)}
                      className="copy-link-button"
                      title="Copy tender link to clipboard"
                    >
                      {copiedId === release.id ? (
                        <>
                          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy Link
                        </>
                      )}
                    </button>

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
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Help & Information</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="modal-close"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <section className="help-section">
                <h3>What is BNSSG?</h3>
                <p>
                  BNSSG stands for <strong>Bristol, North Somerset and South Gloucestershire</strong> Integrated Care System.
                  This dashboard displays procurement opportunities from NHS Bristol, Bristol ICB (Integrated Care Board),
                  and other healthcare organizations operating in the BNSSG region.
                </p>
              </section>

              <section className="help-section">
                <h3>Data Updates</h3>
                <p>
                  Tender data is fetched from the official UK Find a Tender service API. The dashboard:
                </p>
                <ul>
                  <li>Automatically caches results for 1 hour for faster performance</li>
                  <li>Shows tenders published in the last 30 days</li>
                  <li>Updates when you click the "Refresh Data" button</li>
                  <li>Displays the last update timestamp in the header</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>What Tenders Are Included?</h3>
                <p>
                  The dashboard searches all UK public sector tenders and filters to show only those matching:
                </p>
                <ul>
                  <li>Organizations containing "BNSSG"</li>
                  <li>"Bristol, North Somerset and South Gloucestershire"</li>
                  <li>"NHS Bristol"</li>
                  <li>"Bristol ICB"</li>
                </ul>
                <p>
                  Search covers tender titles, descriptions, buyer names, and participating organization details.
                </p>
              </section>

              <section className="help-section">
                <h3>Features</h3>
                <ul>
                  <li><strong>Sort & Filter:</strong> Use the toolbar to find relevant opportunities quickly</li>
                  <li><strong>Export CSV:</strong> Download all visible tenders for offline analysis</li>
                  <li><strong>Copy Link:</strong> Share individual tender URLs with colleagues</li>
                  <li><strong>Print View:</strong> Print a clean list of opportunities</li>
                  <li><strong>Email Alerts:</strong> Enable to remind you to check back daily (UI only - no actual emails sent)</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>Need Help?</h3>
                <p>
                  For questions about specific tenders, contact the buyer organization directly via the Find a Tender service.
                </p>
                <p>
                  For dashboard technical issues or feature requests, please contact:
                  <strong> Sirona Care and Health IT Support</strong>
                </p>
              </section>

              <section className="help-section">
                <h3>Data Source</h3>
                <p>
                  All tender data comes from the official UK government Find a Tender service (<a href="https://www.find-tender.service.gov.uk" target="_blank" rel="noopener noreferrer">find-tender.service.gov.uk</a>),
                  which publishes public sector procurement opportunities in the Open Contracting Data Standard (OCDS) format.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="toast-notification">
          <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Link copied to clipboard!</span>
        </div>
      )}

      {/* PRINT FOOTER */}
      <div className="print-footer">
        <p>Generated by Sirona Care and Health - BNSSG Tender Dashboard</p>
        <p>Printed on: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>Data source: UK Find a Tender Service (find-tender.service.gov.uk)</p>
      </div>
    </div>
  )
}

export default App
