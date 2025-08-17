
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { QRCodeCanvas } from 'qrcode.react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { getDoc, setDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db, urlsCollection } from './firebase';
import './App.css';

function generateShortUrl() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function Home() {
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (longUrl.trim() === '') return;

    // Check if URL already exists in Firestore
    const querySnapshot = await getDocs(urlsCollection);
    let existingDoc = querySnapshot.docs.find(d => d.data().longUrl === longUrl);

    if (existingDoc) {
      setShortUrl(`${window.location.origin}/${existingDoc.id}`);
    } else {
      const newShortUrl = generateShortUrl();
      const newDocRef = doc(db, "urls", newShortUrl);

      const newUrlData = {
        longUrl: longUrl,
        visits: 0,
        createdAt: new Date().toISOString()
      };

      await setDoc(newDocRef, newUrlData);
      setShortUrl(`${window.location.origin}/${newShortUrl}`);
    }
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container">
      <h1>The only URL Shortener you'll ever need! 👇</h1>
      <p className="tagline">Create, track, and share your links with a single click.</p>
      <Link to="/analytics" className="analytics-link">View Analytics</Link>
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          value={longUrl}
          onChange={(e) => setLongUrl(e.target.value)}
          placeholder="Enter your long URL"
          required
        />
        <button type="submit">Shorten URL</button>
      </form>

      {shortUrl && (
        <div className="result-container">
          <p>
            Your shortened URL: 
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">
              {shortUrl}
            </a>
          </p>
          <button onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <div className="qr-code-container">
            <QRCodeCanvas value={shortUrl} size={128} />
            <p>Scan to visit</p>
          </div>
        </div>
      )}
    </div>
  );
}

function RedirectPage() {
  const { shortUrl } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUrlAndRedirect = async () => {
      const docRef = doc(db, "urls", shortUrl);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const urlData = docSnap.data();
        const newVisits = (urlData.visits || 0) + 1;
        const today = new Date().toISOString().split('T')[0];

        // Ensure analytics field exists and is an array
        const analytics = urlData.analytics ? [...urlData.analytics] : [];
        
        // Find if an entry for today already exists
        const todayAnalyticsIndex = analytics.findIndex(item => item.date === today);

        if (todayAnalyticsIndex > -1) {
          // If it exists, increment the visits for today
          analytics[todayAnalyticsIndex].visits++;
        } else {
          // If not, add a new entry for today
          analytics.push({ date: today, visits: 1 });
        }

        // Update the document in Firestore with the new data
        await updateDoc(docRef, { 
          visits: newVisits, 
          analytics: analytics 
        });

        window.location.href = urlData.longUrl;
      } else {
        // If the document doesn't exist, navigate to the home page
        navigate('/');
      }
    };

    fetchUrlAndRedirect();
  }, [shortUrl, navigate]);

  return <div>Redirecting...</div>;
}

function AnalyticsPage() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrls = async () => {
      const querySnapshot = await getDocs(urlsCollection);
      const fetchedUrls = querySnapshot.docs.map(doc => ({
        shortUrl: doc.id,
        ...doc.data()
      }));
      setUrls(fetchedUrls);
      setLoading(false);
    };
    fetchUrls();
  }, []);

  return (
    <div className="container analytics-container">
      <h1>Analytics Dashboard</h1>
      <Link to="/" className="back-link">← Back to Home</Link>
      {loading ? (
        <p>Loading analytics...</p>
      ) : urls.length === 0 ? (
        <p>No shortened URLs yet.</p>
      ) : (
        urls.map((url) => (
          <div key={url.shortUrl} className="analytics-card">
            <h3>Short URL: <a href={`/${url.shortUrl}`} target="_blank" rel="noopener noreferrer">{url.shortUrl}</a></h3>
            <p>Long URL: <a href={url.longUrl} target="_blank" rel="noopener noreferrer">{url.longUrl}</a></p>
            <p>Total Visits: <span className="visits">{url.visits}</span></p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={url.analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="visits" stroke="#8884d8" name="Daily Visits" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/:shortUrl" element={<RedirectPage />} />
      </Routes>
    </Router>
  );
}

export default App;