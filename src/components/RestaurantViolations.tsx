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
  violation: string;
  vio_desc: string;
}

type SortOption = 'none' | 'county' | 'city' | 'zipcode';
type County = 'Sussex' | 'Kent' | 'New Castle';

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
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const API_ENDPOINT = 'https://data.delaware.gov/resource/384s-wygj.json';
  const APP_TOKEN = import.meta.env.VITE_API_KEY;

// first effect \\\ Fetch data once when component mounts
useEffect(() => {
    const fetchData = async () => {
      try {
        const countResponse = await axios.get(API_ENDPOINT, {
          params: {
            '$select': 'count(*)',
            '$$app_token': APP_TOKEN
          }
        });
        
        setTotalCount(parseInt(countResponse.data[0].count));
  
        const violationsResponse = await axios.get(API_ENDPOINT, {
          params: {
            '$limit': 250,
            '$order': 'insp_date DESC',
            '$$app_token': APP_TOKEN
          }
        });
  
        setViolations(violationsResponse.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch restaurant violations');
        setLoading(false);
        console.error(err);
      }
    };
  
    fetchData();
  }, []); // empty dependency array - runs once on mount
  
  // second effect \\\ update cities list when violations change
  useEffect(() => {
    const cities = [...new Set(violations.map(v => v.restcity))].sort();
    setAvailableCities(cities);
  }, [violations]); // this is fine because we're not updating violations here

  if (loading) return <div className="flex justify-center items-center min-h-screen">
    <div className="text-xl font-semibold text-gray-700">Loading violations...</div>
  </div>;

  if (error) return <div className="flex justify-center items-center min-h-screen">
    <div className="text-xl font-semibold text-red-600">{error}</div>
  </div>;

  const isInCounty = (city: string, county: County): boolean => {
    const countyMap: Record<County, string[]> = {
      'Sussex': ['Milford', 'Seaford', 'Georgetown', 'Millsboro', 'Laurel', 'Milton', 'Lewes', 'Selbyville', 'Ocean View', 'Long Neck', 'Bridgeville', 'Delmar', 'Millville', 'Blades', 'Rehoboth Beach', 'Greenwood', 'Bethany Beach', 'Dagsboro', 'Frankford'],
      'Kent': ['Dover', 'Milford', 'Smyrna', 'Clayton', 'Camden', 'Rising Sun-Lebanon', 'Highland Acres', 'Harrington', 'Dover Base Housing', 'Riverview', 'Kent Acres', 'Cheswold', 'Wyoming', 'Woodside East', 'Felton', 'Rodney Village', 'Frederica', 'Houston', 'Bowers', 'Magnolia', 'Kenton', 'Little Creek', 'Woodside', 'Leipsic', 'Viola', 'Farmington', 'Hartly'],
      'New Castle': ['Wilmington', 'Newark', 'Middletown', 'Bear', 'Glasgow', 'Brookside', 'Hockessin', 'Smyrna', 'Pike Creek Valley', 'Claymont', 'North Star', 'Wilmington Manor', 'Pike Creek', 'Edgemoor', 'Elsmere', 'New Castle', 'Clayton', 'Greenville', 'Townsend', 'Delaware City', 'Bellefonte', 'Newport', 'Arden', 'Odessa', 'Ardentown', 'Ardencroft']
    };
    return countyMap[county].includes(city);
  };

  const getFilteredViolations = () => {
    let filtered = violations;
    
    switch (sortOption) {
      case 'county':
        if (selectedCounty) {
          filtered = violations.filter(v => isInCounty(v.restcity, selectedCounty));
        }
        break;
      case 'city':
        if (selectedCity) {
          filtered = violations.filter(v => v.restcity === selectedCity);
        }
        break;
      case 'zipcode':
        if (selectedZipcode) {
          filtered = violations.filter(v => v.restzip === selectedZipcode);
        }
        break;
    }
    
    return filtered.sort((a, b) => 
      new Date(b.insp_date).getTime() - new Date(a.insp_date).getTime()
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">InsightBites 🍽️</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">Delaware Restaurant Violations</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Hello and welcome to InsightBite, I wanted to create a website that would 
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
                    setSortOption('county');
                    setSelectedCounty(null);
                    setSelectedCity('');
                    setSelectedZipcode('');
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
            Total Violations in Delaware: {totalCount.toLocaleString()}
          </h2>
          <p className="text-lg text-gray-600">
            Showing {violations.length} most recent violations
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-lg rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Violation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getFilteredViolations().map((violation, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{violation.restname}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.restaddress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.restcity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.violation}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{violation.vio_desc}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(violation.insp_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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