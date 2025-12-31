'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, ArrowLeft, Search, MapPin, Star, Loader, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { fetchAllStores } from '@/lib/database'
import { searchMerchantStore } from '@/lib/searchStore'

interface Restaurant {
  id: number
  restaurant_id: string
  restaurant_name: string
  city: string
  avg_rating: number
  total_reviews: number
  is_active: boolean
  is_verified: boolean
  owner_phone?: string
}

export default function SearchPage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('merchant_id') // 'merchant_id' or 'mobile'
  const [hasSearched, setHasSearched] = useState(false)

  // Load restaurants from Supabase on component mount
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const data = await fetchAllStores()
        setRestaurants(data)
      } catch (err) {
        console.error('Error loading restaurants:', err)
      }
    }

    loadRestaurants()
  }, [])

  // Handle search button click
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search value')
      return
    }
    setIsLoading(true)
    setError('')
    let filtered: any[] = []
    try {
      if (searchType === 'merchant_id') {
        filtered = await searchMerchantStore(searchQuery.trim(), 'mx_id')
      } else if (searchType === 'mobile') {
        filtered = await searchMerchantStore(searchQuery.trim(), 'mobile')
      }
      setFilteredRestaurants(filtered)
      setHasSearched(true)
      if (filtered.length === 0) {
        setError('No stores matching your search were found. Please check your details and try again, or contact support if you need further assistance.')
      }
    } catch (err) {
      setError('Error searching stores. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectRestaurant = (restaurantId: string) => {
    // Store restaurant ID and redirect to MX dashboard
    localStorage.setItem('selectedRestaurantId', restaurantId)
    router.push('/mx/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Find Your Store</h1>
        </div>
        <div className="w-20"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Search merchant
          </h2>
          <p className="text-slate-600 mb-6">
            Select from the dropdown for the type of search
          </p>

          {/* Search Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Search Type Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => {
                    setSearchType(e.target.value)
                    setSearchQuery('')
                    setHasSearched(false)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-700 bg-white font-medium"
                >
                  <option value="merchant_id">Merchant ID</option>
                  <option value="mobile">Mobile Number</option>
                </select>
              </div>

              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {searchType === 'merchant_id' ? 'Merchant ID or Store Name' : 'Mobile Number'}
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={searchType === 'merchant_id' ? 'Enter merchant ID or store name...' : 'Enter mobile number...'}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-900 placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
                className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 h-fit w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    SEARCH
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div>
          {error ? (
            // Error state
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Store not found</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No stores found
              </h3>
              <p className="text-slate-600">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Available Stores ({filteredRestaurants.length})
              </h3>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-6 py-4 text-left font-semibold">Store Name</th>
                      <th className="px-6 py-4 text-left font-semibold">Store ID</th>
                      <th className="px-6 py-4 text-left font-semibold">City</th>
                      <th className="px-6 py-4 text-left font-semibold">Parent MID</th>
                      <th className="px-6 py-4 text-left font-semibold">Status</th>
                      <th className="px-6 py-4 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRestaurants.map((restaurant) => (
                      <tr
                        key={restaurant.id}
                        className="bg-white hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleSelectRestaurant(restaurant.store_id)}
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          >
                            {restaurant.store_name}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleSelectRestaurant(restaurant.store_id)}
                            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-mono"
                          >
                            {restaurant.store_id}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {restaurant.city}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-slate-900">
                            {restaurant.parent_id ?? 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                restaurant.is_active ? 'bg-green-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            <span className="text-sm font-medium text-slate-700">
                              {restaurant.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleSelectRestaurant(restaurant.restaurant_id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all text-sm"
                          >
                            View Store
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
