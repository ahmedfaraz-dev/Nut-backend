import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_BASE_URL = 'https://api.countrystatecity.in/v1';

// Get all countries (with name, iso2 code, and phone code)
const getCountries = async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/countries`, {
      headers: { 'X-CSCAPI-KEY': process.env.CSC_API_KEY }
    });

    // Map to a clean response format
    const countries = response.data.map((country) => ({
      name: country.name,
      iso2: country.iso2,
      phoneCode: country.phonecode
    }));

    return res.status(200).json({ success: true, data: countries });
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching countries' });
  }
};

// Get cities by Country ISO2 code (e.g., 'US', 'PK')
 const getCitiesByCountry = async (req, res) => {
  const { countryIso } = req.params;

  try {
    // 1. Get Country Name from ISO2 code using CountryStateCity API
    const countryRes = await axios.get(
      `https://api.countrystatecity.in/v1/countries/${countryIso}`,
      {
        headers: { 'X-CSCAPI-KEY': process.env.CSC_API_KEY },
      }
    );
    const countryName = countryRes.data.name;

    // 2. Fetch Cities via CountriesNow API (100% Free, No 403 errors)
    const citiesRes = await axios.post(
      'https://countriesnow.space/api/v0.1/countries/cities',
      { country: countryName }
    );

    const cities = citiesRes.data.data || [];
    return res.status(200).json({ success: true, data: cities });
  } catch (error) {
    console.error(`Error fetching cities for ${countryIso}:`, error.message);
    // Return empty array instead of throwing error so UI doesn't crash
    return res.status(200).json({ success: true, data: [] });
  }
};


// Get phone/dial code for a specific country by ISO2 code (e.g., 'PK', 'US')
const getPhoneCodeByCountry = async (req, res) => {
  const { countryIso } = req.params;

  if (!countryIso) {
    return res.status(400).json({ success: false, message: 'Country ISO2 code is required' });
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/countries/${countryIso.toUpperCase()}`,
      { headers: { 'X-CSCAPI-KEY': process.env.CSC_API_KEY } }
    );

    const country = response.data;
    return res.status(200).json({
      success: true,
      data: {
        name: country.name,
        iso2: country.iso2,
        phoneCode: country.phonecode
      }
    });
  } catch (error) {
    console.error(`Error fetching phone code for ${countryIso}:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching phone code' });
  }
};


export { getCountries, getCitiesByCountry, getPhoneCodeByCountry };