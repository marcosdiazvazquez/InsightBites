import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RestaurantViolations.css';

// interface for the restaurant data structure
interface RestaurantViolation {
  restname: string;
  restaddress: string;
  restcity: string;
  restzip: string;
  insp_date: string;
  insp_type: string;
  violation: string;
  vio_desc: string;
}

type SortOption = 'none' | 'county' | 'city' | 'zipcode' | 'restaurant';
type County = 'Sussex' | 'Kent' | 'New Castle';

const COUNTY_MAP: Record<County, string[]> = {
  'Sussex': ['Milford', 'Seaford', 'Georgetown', 'Millsboro', 'Laurel', 'Milton', 'Lewes', 'Selbyville', 'Ocean View', 'Long Neck', 'Bridgeville', 'Delmar', 'Millville', 'Blades', 'Rehoboth Beach', 'Greenwood', 'Bethany Beach', 'Dagsboro', 'Frankford'],
  'Kent': ['Dover', 'Milford', 'Smyrna', 'Clayton', 'Camden', 'Rising Sun-Lebanon', 'Highland Acres', 'Harrington', 'Dover Base Housing', 'Riverview', 'Kent Acres', 'Cheswold', 'Wyoming', 'Woodside East', 'Felton', 'Rodney Village', 'Frederica', 'Houston', 'Bowers', 'Magnolia', 'Kenton', 'Little Creek', 'Woodside', 'Leipsic', 'Viola', 'Farmington', 'Hartly'],
  'New Castle': ['Wilmington', 'Newark', 'Middletown', 'Bear', 'Glasgow', 'Brookside', 'Hockessin', 'Smyrna', 'Pike Creek Valley', 'Claymont', 'North Star', 'Wilmington Manor', 'Pike Creek', 'Edgemoor', 'Elsmere', 'New Castle', 'Clayton', 'Greenville', 'Townsend', 'Delaware City', 'Bellefonte', 'Newport', 'Arden', 'Odessa', 'Ardentown', 'Ardencroft']
};

const RestaurantViolations: React.FC = () => {
  // state to store our violations data
  const [violations, setViolations] = useState<RestaurantViolation[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // sorting state declarations
  const [sortOption, setSortOption] = useState<SortOption>('none');
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedZipcode, setSelectedZipcode] = useState<string>('');
  const [searchRestaurant, setSearchRestaurant] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);

  const API_ENDPOINT = 'https://data.delaware.gov/resource/384s-wygj.json';
  const APP_TOKEN = import.meta.env.VITE_API_KEY;

  // Build a $where clause based on the current filter selections
  const buildWhereClause = (): string => {
    const conditions: string[] = ["insp_type in('Complaint','Follow-up')"];

    if (sortOption === 'city' && selectedCity) {
      conditions.push(`restcity='${selectedCity}'`);
    } else if (sortOption === 'zipcode' && selectedZipcode.length === 5) {
      conditions.push(`restzip='${selectedZipcode}'`);
    } else if (sortOption === 'county' && selectedCounty) {
      const cityList = COUNTY_MAP[selectedCounty].map(c => `'${c}'`).join(',');
      conditions.push(`restcity in(${cityList})`);
    } else if (sortOption === 'restaurant' && debouncedSearch.length >= 3) {
      const escaped = debouncedSearch.replace(/'/g, "''");
      conditions.push(`upper(restname) LIKE upper('%${escaped}%')`);
    }

    return conditions.join(' AND ');
  };

  // Debounce restaurant search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchRestaurant);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchRestaurant]);

  // Fetch all available cities once on mount (for the dropdown)
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(API_ENDPOINT, {
          params: {
            '$select': 'restcity',
            '$group': 'restcity',
            '$order': 'restcity',
            '$limit': 1000,
            '$$app_token': APP_TOKEN
          }
        });
        setAvailableCities(response.data.map((r: { restcity: string }) => r.restcity));
      } catch (err) {
        console.error('Failed to fetch cities list', err);
      }
    };
    fetchCities();
  }, []);

  // Fetch violations whenever filters change
  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);
      try {
        const whereClause = buildWhereClause();

        const countResponse = await axios.get(API_ENDPOINT, {
          params: {
            '$select': 'count(*)',
            '$where': whereClause,
            '$$app_token': APP_TOKEN
          }
        });
        setTotalCount(parseInt(countResponse.data[0].count));

        const violationsParams: Record<string, string | number> = {
          '$limit': 200,
          '$order': 'insp_date DESC',
          '$where': whereClause,
          '$$app_token': APP_TOKEN
        };

        const violationsResponse = await axios.get(API_ENDPOINT, { params: violationsParams });
        setViolations(violationsResponse.data);
      } catch (err) {
        setError('Failed to fetch restaurant violations');
        console.error(err);
      } finally {
        setFetching(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [sortOption, selectedCounty, selectedCity, selectedZipcode, debouncedSearch]);

  if (loading) return <div className="flex justify-center items-center min-h-screen">
    <div className="text-xl font-semibold text-gray-700">Loading violations...</div>
  </div>;

  if (error) return <div className="flex justify-center items-center min-h-screen">
    <div className="text-xl font-semibold text-red-600">{error}</div>
  </div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">InsightBites 🍽️</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">Delaware Restaurant Violations</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Hello and welcome to InsightBites, I wanted to create a website that would 
            allow Delawareans to make informed choices regarding their restaurant choices. 
            Thanks to <a href="https://data.delaware.gov/" className="text-blue-600 hover:text-blue-800 underline">
            Delaware Open Data</a>, I was able to use their data to make a website that is easy
            to navigate and use. It's important to note that the data only displays information 
            from within the last two years.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <div className="space-y-6">
            {/* main sorting buttons section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-700">Sort violations by:</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    setSortOption('restaurant');
                    setSelectedCounty(null);
                    setSelectedCity('');
                    setSelectedZipcode('');
                    setSearchRestaurant('');
                  }}
                  className={`px-6 py-3 rounded-lg font-medium shadow-lg transform transition-all duration-200
                    ${sortOption === 'restaurant'
                      ? 'bg-blue-600 text-white scale-105 hover:bg-blue-700'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600'}`}
                >
                  Restaurant
                </button>
                <button
                  onClick={() => {
                    setSortOption('county');
                    setSelectedCounty(null);
                    setSelectedCity('');
                    setSelectedZipcode('');
                    setSearchRestaurant('');
                  }}
                  className={`px-6 py-3 rounded-lg font-medium shadow-lg transform transition-all duration-200 
                    ${sortOption === 'county' 
                      ? 'bg-blue-600 text-white scale-105 hover:bg-blue-700' 
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600'}`}
                >
                  County
                </button>
                <button
                  onClick={() => {
                    setSortOption('city');
                    setSelectedCounty(null);
                    setSelectedCity('');
                    setSelectedZipcode('');
                    setSearchRestaurant('');
                  }}
                  className={`px-6 py-3 rounded-lg font-medium shadow-lg transform transition-all duration-200 
                    ${sortOption === 'city' 
                      ? 'bg-blue-600 text-white scale-105 hover:bg-blue-700' 
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600'}`}
                >
                  City
                </button>
                <button
                  onClick={() => {
                    setSortOption('zipcode');
                    setSelectedCounty(null);
                    setSelectedCity('');
                    setSelectedZipcode('');
                    setSearchRestaurant('');
                  }}
                  className={`px-6 py-3 rounded-lg font-medium shadow-lg transform transition-all duration-200 
                    ${sortOption === 'zipcode' 
                      ? 'bg-blue-600 text-white scale-105 hover:bg-blue-700' 
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600'}`}
                >
                  Zipcode
                </button>
              </div>
            </div>

            {/* restaurant search */}
            {sortOption === 'restaurant' && (
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-600">Search for a restaurant:</h4>
                <input
                  type="text"
                  placeholder="Enter restaurant name (min 3 characters)"
                  value={searchRestaurant}
                  onChange={(e) => setSearchRestaurant(e.target.value)}
                  className="w-full max-w-md px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* county selection buttons */}
            {sortOption === 'county' && (
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-600">Select a county:</h4>
                <div className="flex flex-wrap gap-4">
                  {['Sussex', 'Kent', 'New Castle'].map((county) => (
                    <button
                      key={county}
                      onClick={() => setSelectedCounty(county as County)}
                      className={`px-5 py-2 rounded-md font-medium transition-all duration-200 
                        ${selectedCounty === county 
                          ? 'bg-green-600 text-white shadow-md transform scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-green-500 hover:text-green-600'}`}
                    >
                      {county}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* city dropdown */}
            {sortOption === 'city' && (
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-600">Select a city:</h4>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full max-w-md px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a city</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}

            {/* zipcode input */}
            {sortOption === 'zipcode' && (
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-600">Enter a zipcode:</h4>
                <input
                  type="text"
                  placeholder="Enter zipcode"
                  value={selectedZipcode}
                  onChange={(e) => setSelectedZipcode(e.target.value)}
                  pattern="[0-9]*"
                  maxLength={5}
                  className="w-full max-w-md px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        <div className="violations-summary text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Total Matching Violations: {totalCount.toLocaleString()}
          </h2>
          <p className="text-lg text-gray-600">
            {fetching ? 'Searching...' : `Showing ${violations.length} most recent violations`}
          </p>
        </div>

        {violations.length === 0 && !loading && (
          <div className="no-results">
            <p className="text-xl font-semibold text-gray-700">No violations found</p>
            <p className="text-lg text-gray-500">Try adjusting your search or filter</p>
          </div>
        )}

        {/* Desktop table */}
        <div className="desktop-only overflow-x-auto">
          <table className="min-w-full bg-white shadow-lg rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Violation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {violations.map((violation, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{violation.restname}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.restaddress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.restcity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.violation}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{violation.vio_desc}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.insp_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(violation.insp_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-only">
          {violations.map((violation, index) => (
            <div key={index} className="violation-card">
              <h3 className="violation-card-name">{violation.restname}</h3>
              <p className="violation-card-address">{violation.restaddress}, {violation.restcity}</p>
              <div className="violation-card-details">
                <span className="violation-card-label">Violation:</span> {violation.violation}
              </div>
              <div className="violation-card-desc">{violation.vio_desc}</div>
              <div className="violation-card-footer">
                <span className="violation-card-type">{violation.insp_type}</span>
                <span className="violation-card-date">{new Date(violation.insp_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-12 text-center text-gray-600">
          <p>Site created by <a target="_blank" href="https://www.marcosdiazvazquez.com/" 
            className="text-blue-600 hover:text-blue-800 underline">
            Marcos Diaz Vazquez
          </a></p>
        </footer>
      </div>
    </div>
  );
};

export default RestaurantViolations;