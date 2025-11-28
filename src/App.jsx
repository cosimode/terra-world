import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import customTerritories from './data/custom_territories.json';
import MapUtilities from './components/MapUtilities';
import './App.css';

// --- CONFIGURAZIONE ---
const COLORS = [
    { color: '#ef4444', name: 'Red' },
    { color: '#f97316', name: 'Orange' },
    { color: '#eab308', name: 'Yellow' },
    { color: '#22c55e', name: 'Green' },
    { color: '#3b82f6', name: 'Blue' },
    { color: '#8b5cf6', name: 'Violet' },
    { color: '#ec4899', name: 'Pink' },
    { color: '#334155', name: 'Slate' }
];

// --- LISTA OBIETTIVI (SVG) ---
const ACHIEVEMENTS_LIST = [
    { id: 'first_step', title: 'First Step', desc: 'Mark your first country.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> },
    { id: 'traveler', title: 'Traveler', desc: 'Visit 5 countries.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> },
    { id: 'explorer', title: 'Explorer', desc: 'Visit 20 countries.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg> },
    { id: 'globetrotter', title: 'Globetrotter', desc: 'Visit 50 countries.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> },
    { id: 'euro_trip', title: 'Euro Trip', desc: 'Visit 5 countries in Europe.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/></svg> },
    { id: 'safari', title: 'Safari', desc: 'Visit 5 countries in Africa.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg> },
    { id: 'oriental', title: 'Oriental', desc: 'Visit 5 countries in Asia.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 6 6 1-4.5 4.5 1 6-5.5-3-5.5 3 1-6-4.5-4.5 6-1 3-6z"/></svg> },
    { id: 'americas', title: 'New World', desc: 'Visit 5 countries in Americas.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/><path d="M9 9h1"/><path d="M14 9h1"/><path d="M9 13h1"/><path d="M14 13h1"/></svg> },
    { id: 'micronation', title: 'Tiny States', desc: 'Visit a Micronation (e.g. Sealand).', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg> }
];

function App() {
    // --- STATE ---
    const [session, setSession] = useState(null);
    const [geoData, setGeoData] = useState(null);
    const [visited, setVisited] = useState({});
    const [selectedColor, setSelectedColor] = useState(COLORS[4].color);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [sharedUsername, setSharedUsername] = useState(null);
    const [notification, setNotification] = useState(null);
    const [minLoadTimePassed, setMinLoadTimePassed] = useState(false);

    // TIMER CARICAMENTO INIZIALE
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadTimePassed(true);
        }, 2500); // 2500ms = 2.5 secondi di attesa minima
        return () => clearTimeout(timer);
    }, []);

    // Stats & Achievements
    const [statsModal, setStatsModal] = useState(false);
    const [achievementsModal, setAchievementsModal] = useState(false);
    const [leaderboardModal, setLeaderboardModal] = useState(false);
    const [infoModal, setInfoModal] = useState(false);
    const [unlockedAchievements, setUnlockedAchievements] = useState([]);
    const [statsData, setStatsData] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    // Search & Map
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [mapCenter, setMapCenter] = useState(null);
    const [highlightedId, setHighlightedId] = useState(null);

    // UI
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);

    // Modal
    const [modal, setModal] = useState({ isOpen: false, type: null, feature: null });
    const [visitDate, setVisitDate] = useState('');
    const [useDate, setUseDate] = useState(false);

    // Auth
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMessage, setAuthMessage] = useState(null);

    // --- REFS ---
    const visitedRef = useRef({});
    useEffect(() => { visitedRef.current = visited; }, [visited]);
    const sessionRef = useRef(null);
    useEffect(() => { sessionRef.current = session; }, [session]);
    const colorRef = useRef(selectedColor);
    useEffect(() => { colorRef.current = selectedColor; }, [selectedColor]);

    const isSilenced = useRef(true);
    useEffect(() => {
        isSilenced.current = true;
        const timer = setTimeout(() => { isSilenced.current = false; }, 2500);
        return () => clearTimeout(timer);
    }, [session]);

    // --- HELPER ---
    const getGeoId = (feature) => {
        if (!feature || !feature.properties) return null;
        let code = feature.properties.adm0_a3 || feature.properties.iso_a3;
        if (!code || code === '-99') code = feature.properties.name || feature.properties.name_long;
        return code;
    };

    // Helper per ottenere l'URL della bandiera
    const getFlagUrl = (feature) => {
        if (!feature || !feature.properties) return null;
        // Natural Earth di solito ha 'iso_a2' (codice a 2 lettere)
        const code = feature.properties.iso_a2;
        if (code && code !== '-99') {
            return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
        }
        return null; // Nessuna bandiera per micronazioni custom senza codice standard
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return new Intl.DateTimeFormat(navigator.language || 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    };

    // 1. INIT
    useEffect(() => {
        fetchLeaderboard();
        fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(worldData => {
                const mergedFeatures = [...worldData.features, ...customTerritories];
                mergedFeatures.sort((a, b) => {
                    const isPointA = a.geometry.type === 'Point' || a.geometry.type === 'MultiPoint';
                    const isPointB = b.geometry.type === 'Point' || b.geometry.type === 'MultiPoint';
                    if (isPointA && !isPointB) return 1;
                    if (!isPointA && isPointB) return -1;
                    return (a.properties.name || '').localeCompare(b.properties.name || '');
                });
                setGeoData({ type: "FeatureCollection", features: mergedFeatures });
            });

        const params = new URLSearchParams(window.location.search);
        const sharedUserId = params.get('u');
        const sharedName = params.get('n');

        if (sharedUserId) {
            setIsReadOnly(true);
            setSharedUsername(sharedName || 'Traveler');
            fetchVisits(sharedUserId);
        } else {
            setIsReadOnly(false);
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                if (session) fetchVisits(session.user.id);
            });
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
                if (session) fetchVisits(session.user.id);
                else setVisited({});
            });
            return () => subscription.unsubscribe();
        }
    }, []);

    const fetchVisits = async (userId) => {
        const { data, error } = await supabase.from('visited_countries').select('country_code, color, visit_date');
        if (!error && data) {
            const visitMap = {};
            data.forEach(row => { visitMap[row.country_code] = { color: row.color || '#22c55e', date: row.visit_date }; });
            setVisited(visitMap);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase.rpc('get_leaderboard');
            if (!error && data) setLeaderboard(data);
        } catch (err) { console.error("Leaderboard error", err); }
    };

    // --- STATS & ACHIEVEMENTS ---
    useEffect(() => {
        if (!geoData) return;

        const statsMap = {};
        geoData.features.forEach(f => {
            const cont = f.properties.continent || 'Other';
            if (!statsMap[cont]) statsMap[cont] = { total: 0, visited: 0 };
            statsMap[cont].total += 1;
            const id = getGeoId(f);
            if (visited[id]) statsMap[cont].visited += 1;
        });
        const statsArray = Object.keys(statsMap).map(key => ({
            name: key, visited: statsMap[key].visited, total: statsMap[key].total,
            percent: Math.round((statsMap[key].visited / statsMap[key].total) * 100)
        })).sort((a, b) => b.percent - a.percent);
        setStatsData(statsArray);

        const visitedCount = Object.keys(visited).length;
        const unlocked = [];
        if (visitedCount >= 1) unlocked.push('first_step');
        if (visitedCount >= 5) unlocked.push('traveler');
        if (visitedCount >= 20) unlocked.push('explorer');
        if (visitedCount >= 50) unlocked.push('globetrotter');
        if (statsMap['Europe']?.visited >= 5) unlocked.push('euro_trip');
        if (statsMap['Africa']?.visited >= 5) unlocked.push('safari');
        if (statsMap['Asia']?.visited >= 5) unlocked.push('oriental');
        if ((statsMap['North America']?.visited + (statsMap['South America']?.visited || 0)) >= 5) unlocked.push('americas');

        const hasMicronation = geoData.features.some(f => {
            const id = getGeoId(f);
            return visited[id] && (f.geometry.type === 'Point' || f.properties.type === 'Micronation');
        });
        if (hasMicronation) unlocked.push('micronation');

        if (isSilenced.current) {
            setUnlockedAchievements(unlocked);
        } else {
            if (unlocked.length > unlockedAchievements.length) {
                const newIds = unlocked.filter(id => !unlockedAchievements.includes(id));
                if (newIds.length > 0) {
                    const badge = ACHIEVEMENTS_LIST.find(a => a.id === newIds[0]);
                    if (badge) {
                        setNotification({ title: 'Achievement Unlocked!', desc: badge.title, icon: badge.icon });
                        setTimeout(() => setNotification(null), 4000);
                    }
                }
            }
            setUnlockedAchievements(unlocked);
        }
    }, [visited, geoData, unlockedAchievements]);

    // 3. MAP CLICK
    const onCountryClick = (feature) => {
        if (isReadOnly) {
            const id = getGeoId(feature);
            if (visitedRef.current[id]) setModal({ isOpen: true, type: 'INFO', feature: feature });
            return;
        }
        const id = getGeoId(feature);
        if (!id) return;
        if (!sessionRef.current) { setIsMobilePanelOpen(true); return; }
        const isVisited = visitedRef.current[id];
        if (isVisited) { setModal({ isOpen: true, type: 'INFO', feature: feature }); }
        else { setVisitDate(''); setUseDate(false); setModal({ isOpen: true, type: 'ADD', feature: feature }); }
    };

    // 4. ACTIONS
    const confirmAdd = async () => {
        if (!sessionRef.current) return;
        const feature = modal.feature;
        const id = getGeoId(feature);
        const name = feature.properties.name || feature.properties.admin;
        const userId = sessionRef.current.user.id;
        const colorToSave = colorRef.current;
        const dateToSave = useDate ? visitDate : null;

        setVisited(prev => ({ ...prev, [id]: { color: colorToSave, date: dateToSave } }));
        closeModal();

        await supabase.from('visited_countries').upsert({
            user_id: userId, country_code: id, country_name: name, color: colorToSave, visit_date: dateToSave
        }, { onConflict: 'user_id, country_code' });
        setTimeout(fetchLeaderboard, 1000);
    };

    const confirmDeleteVisit = async () => {
        if (!sessionRef.current) return;
        const feature = modal.feature;
        const id = getGeoId(feature);
        const userId = sessionRef.current.user.id;
        setVisited(prev => { const n = { ...prev }; delete n[id]; return n; });
        closeModal();
        await supabase.from('visited_countries').delete().eq('user_id', userId).eq('country_code', id);
        setTimeout(fetchLeaderboard, 1000);
    };

    const closeModal = () => setModal({ isOpen: false, type: null, feature: null });

    const handleAuth = async (e) => {
        e.preventDefault(); setLoading(true); setAuthMessage(null);
        try {
            if (isLoginMode) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username: username } } });
                if (error) throw error;
                if (!data.session) setAuthMessage("Check your email.");
            }
        } catch (error) { setAuthMessage(error.message); } finally { setLoading(false); }
    };

    const handleDeleteAccount = async () => {
        if(!window.confirm("Delete account permanently?")) return;
        setLoading(true);
        const { error } = await supabase.rpc('delete_own_account');
        if (error) alert("Error: " + error.message);
        else { await supabase.auth.signOut(); setSession(null); setVisited({}); alert("Deleted."); }
        setLoading(false);
    };

    // 6. SEARCH & GPS
    useEffect(() => {
        if (!geoData || searchText.length < 2) { setSearchResults([]); return; }
        const results = geoData.features.filter(f => {
            const name = f.properties.name || f.properties.admin || '';
            return name.toLowerCase().includes(searchText.toLowerCase());
        });
        setSearchResults(results.slice(0, 5));
    }, [searchText, geoData]);

    const handleSelectCountry = (feature) => {
        setMapCenter(feature); setHighlightedId(getGeoId(feature));
        setSearchText(''); setSearchResults([]);
        if (window.innerWidth < 768) setIsMobilePanelOpen(false);
    };

    const handleGPS = () => {
        if (!navigator.geolocation) { alert("GPS not supported."); return; }
        if (!geoData) return;
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const foundFeature = geoData.features.find(feature => isPointInFeature(latitude, longitude, feature));
                setLoading(false);
                if (foundFeature) { handleSelectCountry(foundFeature); onCountryClick(foundFeature); }
                else { alert("Country not found at your location."); }
            },
            () => { setLoading(false); alert("GPS Error."); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleShare = () => {
        const url = `${window.location.origin}${window.location.pathname}?u=${session.user.id}&n=${encodeURIComponent(session.user.user_metadata.username || 'Traveler')}`;
        navigator.clipboard.writeText(url);
        setNotification({ title: 'Link Copied', desc: 'Ready to share!', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> });
        setTimeout(() => setNotification(null), 3000);
    };

    // 7. RENDER & STYLE
    const style = (feature) => {
        const id = getGeoId(feature);
        const data = visited[id];
        const isHighlighted = (id === highlightedId);
        return { fillColor: data ? data.color : '#ffffff', weight: isHighlighted ? 2.5 : 0.5, opacity: 1, color: isHighlighted ? '#f59e0b' : '#64748b', fillOpacity: 1 };
    };

    const pointToLayer = (feature, latlng) => {
        const id = getGeoId(feature);
        const data = visited[id];
        const isHighlighted = (id === highlightedId);
        return L.circle(latlng, { radius: 2000, fillColor: data ? data.color : '#ffffff', color: isHighlighted ? '#f59e0b' : '#334155', weight: isHighlighted ? 5 : 1, opacity: 1, fillOpacity: 1 });
    };

    const onEachFeature = (feature, layer) => {
        const name = feature.properties.name || feature.properties.admin;
        layer.bindTooltip(name, { permanent: false, direction: "center", className: 'country-label' });
        layer.on({ click: (e) => { L.DomEvent.stopPropagation(e); onCountryClick(feature); } });
    };

    // Componente Reset Zoom (FIX CLICCABILITÀ)
    const ResetZoomControl = () => {
        const map = useMap();
        const buttonRef = useRef(null);

        useEffect(() => {
            if (buttonRef.current) {
                // Questa riga è MAGICA: dice a Leaflet "non toccare questo div"
                L.DomEvent.disableClickPropagation(buttonRef.current);
                L.DomEvent.disableScrollPropagation(buttonRef.current);
            }
        }, []);

        return (
            <div
                ref={buttonRef}
                className="leaflet-top leaflet-right"
                style={{
                    marginTop: '10px',
                    marginRight: '10px',
                    zIndex: 1000, // Alto z-index per stare sopra i layer
                    pointerEvents: 'auto' // Assicura che il mouse lo rilevi
                }}
            >
                <button
                    onClick={() => {
                        map.flyTo([25, 10], 2, { duration: 1.5 });
                    }}
                    style={{
                        background: 'white',
                        border: '2px solid rgba(0,0,0,0.2)',
                        borderRadius: '8px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        color: '#333',
                        padding: 0
                    }}
                    title="Reset World View"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </button>
            </div>
        );
    };

    const MapEvents = () => { useMapEvents({ click: () => { setHighlightedId(null); }, }); return null; };

    const visitedCount = Object.keys(visited).length;
    const totalCountries = geoData ? geoData.features.length : 197;
    const percentage = totalCountries > 0 ? ((visitedCount / totalCountries) * 100).toFixed(1) : 0;

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

            {/* LOADER SCREEN: Si vede solo se i dati non sono ancora pronti */}
            {/* LOADER SCREEN: Si vede se mancano i dati OPPURE se non è passato il tempo minimo */}
            {(!geoData || !minLoadTimePassed) && (
                <div className="loading-overlay">
                    <div className="loading-spinner">
                        <div className="earth-icon">🌍</div>
                    </div>
                    <p>Preparing the world...</p>
                </div>
            )}
            <div className={`control-panel ${isMobilePanelOpen ? 'open' : ''}`}>
                <div className="panel-header" onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}>
                    <div><h1>Terra</h1><p className="subtitle"><span className="desktop-text">Your Digital Passport</span><span className="mobile-text">{isMobilePanelOpen ? 'Close Menu' : 'Open Menu'}</span></p></div>
                    <div className="menu-icon-container"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></div>
                </div>

                <div className="panel-content">
                    {isReadOnly && (
                        <div className="user-header-row" style={{background: '#f0f9ff', borderColor: '#bae6fd'}}>
                            <div><span style={{fontSize: '0.7rem', color:'#0ea5e9', display:'block', fontWeight:700}}>MAP OF:</span><b style={{fontSize:'1.1rem', color:'#0284c7'}}>{sharedUsername}</b></div>
                            <button onClick={() => window.location.href = window.location.origin + window.location.pathname} className="btn-cancel" style={{fontSize:'0.8rem', background:'white'}}>Create Yours</button>
                        </div>
                    )}
                    {session && (
                        <div className="user-header-row">
                            <span className="welcome-text">Hi <b>{session.user.user_metadata.username || 'Traveler'}</b></span>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button onClick={async()=> await supabase.auth.signOut()} className="btn-cancel" style={{fontSize:'0.75rem'}}>Logout</button>
                                <button onClick={handleDeleteAccount} className="btn-cancel btn-icon" style={{color:'#ef4444', borderColor:'#fee2e2', background:'#fef2f2'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                            </div>
                        </div>
                    )}

                    <div className="progress-container">
                        <div className="progress-label"><span>World Exploration</span><span>{percentage}%</span></div>
                        <div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%`, backgroundColor: '#3b82f6' }}/></div>
                        <p style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'5px', textAlign:'right'}}>{visitedCount} / {totalCountries} Territories</p>
                    </div>

                    {!session && !isReadOnly && (
                        <div className="auth-section">
                            <div className="auth-tabs"><div className={`auth-tab ${isLoginMode ? 'active' : ''}`} onClick={() => setIsLoginMode(true)}>Login</div><div className={`auth-tab ${!isLoginMode ? 'active' : ''}`} onClick={() => setIsLoginMode(false)}>Sign Up</div></div>
                            <form onSubmit={handleAuth}>
                                {!isLoginMode && <input className="search-input" type="text" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required style={{marginBottom:'10px'}}/>}
                                <input className="search-input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={{marginBottom:'10px'}}/>
                                <input className="search-input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required style={{marginBottom:'15px'}}/>
                                <button type="submit" disabled={loading} className="btn-confirm">{loading ? 'Wait...' : (isLoginMode ? 'Enter' : 'Join')}</button>
                                {authMessage && <p style={{fontSize:'0.8rem', color:'#ef4444', marginTop:'10px'}}>{authMessage}</p>}
                            </form>
                        </div>
                    )}

                    <div className="control-group">
                        <label>Search Country</label>
                        <input type="text" className="search-input" placeholder="Type name..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                        {!isReadOnly && <button onClick={handleGPS} className="gps-btn" disabled={loading}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>{loading ? 'Locating...' : 'Color where I am'}</button>}
                        {searchResults.length > 0 && <ul className="search-results">{searchResults.map((feature, i) => (<li key={i} className="search-result-item" onClick={() => handleSelectCountry(feature)}>{feature.properties.name || feature.properties.admin}</li>))}</ul>}
                    </div>

                    {session && (
                        <div className="control-group">
                            <label>Marker Color</label>
                            <div className="color-options">{COLORS.map((c) => (<div key={c.color} className={`color-circle ${selectedColor === c.color ? 'selected' : ''}`} style={{ backgroundColor: c.color }} onClick={() => setSelectedColor(c.color)}/>))}</div>
                        </div>
                    )}

                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'20px'}}>
                        <button onClick={() => setStatsModal(true)} className="stats-button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>Stats
                        </button>
                        <button onClick={() => setAchievementsModal(true)} className="stats-button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M6 12l4 4 8-8"/></svg>Awards
                        </button>
                        <button onClick={() => setLeaderboardModal(true)} className="stats-button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>Ranking
                        </button>
                        <a href="https://ko-fi.com/" target="_blank" rel="noopener noreferrer" className="stats-button" style={{color:'#ef4444', textDecoration:'none'}}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>Support Me
                        </a>
                    </div>

                    {session && !isReadOnly && (
                        <div className="control-group" style={{marginTop:'20px'}}>
                            <button onClick={handleShare} className="btn-confirm" style={{backgroundColor: '#8b5cf6', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>Share
                            </button>
                        </div>
                    )}

                    <div className="app-footer">
                        <div style={{display:'flex', justifyContent:'center', gap:'15px', fontSize:'0.75rem', color:'#94a3b8', flexWrap:'wrap'}}>
                            <span className="footer-link">GitHub</span> • <span className="footer-link" onClick={() => setInfoModal(true)}>Rules</span> • <span className="footer-link">Privacy</span>
                        </div>
                    </div>
                </div>
            </div>

            <MapContainer center={[25, 10]} zoom={2} style={{ height: "100%", width: "100%", backgroundColor: '#cffafe' }} minZoom={2} zoomControl={false}>
                <MapEvents />
                <ResetZoomControl /> {/* Bottone Reset Zoom */}
                <MapUtilities centerTo={mapCenter} />
                {geoData && <GeoJSON data={geoData} style={style} pointToLayer={pointToLayer} onEachFeature={onEachFeature} />}
            </MapContainer>

            {infoModal && (
                <div className="modal-overlay" onClick={(e) => { if(e.target.className === 'modal-overlay') setInfoModal(false) }}>
                    <div className="modal-content" style={{maxWidth:'450px', textAlign:'left', maxHeight: '80vh', overflowY: 'auto'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'15px'}}>
                            <div style={{background:'#e0f2fe', padding:'10px', borderRadius:'50%', color:'#0284c7', display:'flex', alignItems:'center', justifyItems:'center'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                            <h3 style={{margin:0, fontSize:'1.2rem', color:'#1e293b'}}>What counts as a visit?</h3>
                        </div>
                        <p style={{fontSize:'0.9rem', color:'#475569', lineHeight:'1.5', marginBottom:'20px'}}>To keep your map authentic, we follow international traveler guidelines (inspired by <a href="https://nomadmania.com/minimal-visit/" target="_blank" rel="noreferrer" style={{color:'#3b82f6', textDecoration:'none', fontWeight:600}}>NomadMania</a>).</p>
                        <div style={{background:'#f0fdf4', padding:'16px', borderRadius:'12px', border:'1px solid #bbf7d0', marginBottom:'15px'}}>
                            <h4 style={{margin:'0 0 8px 0', fontSize:'0.95rem', color:'#166534', display:'flex', alignItems:'center', gap:'8px'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>YES, it counts if:</h4>
                            <ul style={{margin:0, paddingLeft:'24px', fontSize:'0.85rem', color:'#14532d', lineHeight:'1.4'}}><li style={{marginBottom:'4px'}}>You stepped on ground and did something meaningful.</li><li>You visited a museum, ate at a local place, or walked around.</li></ul>
                        </div>
                        <div style={{background:'#fef2f2', padding:'16px', borderRadius:'12px', border:'1px solid #fecaca'}}>
                            <h4 style={{margin:'0 0 8px 0', fontSize:'0.95rem', color:'#991b1b', display:'flex', alignItems:'center', gap:'8px'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>NO, it doesn't count if:</h4>
                            <ul style={{margin:0, paddingLeft:'24px', fontSize:'0.85rem', color:'#7f1d1d', lineHeight:'1.4'}}><li style={{marginBottom:'4px'}}>Airport transit/layovers without exiting.</li><li style={{marginBottom:'4px'}}>Passing through by train/bus without stopping.</li><li>Driving through on a highway only.</li></ul>
                        </div>
                        <div className="modal-actions"><button className="btn-confirm" onClick={() => setInfoModal(false)} style={{backgroundColor: '#0f172a'}}>I understand, I'll be honest!</button></div>
                    </div>
                </div>
            )}

            {leaderboardModal && (
                <div className="modal-overlay" onClick={(e) => { if(e.target.className === 'modal-overlay') setLeaderboardModal(false) }}>
                    <div className="modal-content" style={{maxWidth:'400px'}}>
                        <h3 style={{marginTop:0, display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>Top Explorers</h3>
                        <ul className="search-results" style={{maxHeight:'300px', textAlign:'left'}}>
                            {leaderboard.length > 0 ? leaderboard.map((user, idx) => (
                                <li key={idx} className="search-result-item" style={{display:'flex', justifyContent:'space-between', cursor:'pointer'}} onClick={() => { window.location.href = `${window.location.pathname}?u=${user.user_id}&n=${encodeURIComponent(user.username)}`; }}>
                                    <span><b>#{idx + 1}</b> {user.username}</span><span style={{color:'#3b82f6', fontWeight:'600'}}>{user.score}</span>
                                </li>
                            )) : <li style={{padding:'15px', color:'#94a3b8', textAlign:'center'}}>Loading...</li>}
                        </ul>
                        <div className="modal-actions"><button className="btn-confirm" onClick={() => setLeaderboardModal(false)}>Close</button></div>
                    </div>
                </div>
            )}

            {statsModal && (
                <div className="modal-overlay" onClick={(e) => { if(e.target.className === 'modal-overlay') setStatsModal(false) }}>
                    <div className="modal-content" style={{maxWidth:'400px'}}>
                        <h3 style={{marginTop:0, display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>World Stats</h3>
                        <div style={{maxHeight:'300px', overflowY:'auto', paddingRight:'5px'}}>
                            {statsData.map(stat => (
                                <div key={stat.name} className="stat-row">
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', marginBottom:'5px'}}><span style={{fontWeight:600, color:'#334155'}}>{stat.name}</span><span style={{color:'#64748b'}}>{stat.visited} / {stat.total}</span></div>
                                    <div className="progress-track" style={{height:'6px'}}><div className="progress-fill" style={{ width: `${stat.percent}%`, backgroundColor: stat.percent === 100 ? '#22c55e' : '#3b82f6' }}/></div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-actions"><button className="btn-confirm" onClick={() => setStatsModal(false)}>Close</button></div>
                    </div>
                </div>
            )}

            {achievementsModal && (
                <div className="modal-overlay" onClick={(e) => { if(e.target.className === 'modal-overlay') setAchievementsModal(false) }}>
                    <div className="modal-content" style={{maxWidth:'420px', textAlign:'left'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3 style={{margin:0, display:'flex', alignItems:'center', gap:'10px'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M6 12l4 4 8-8"/></svg>Achievements</h3>
                            <span style={{fontSize:'0.8rem', fontWeight:600, color:'#3b82f6'}}>{unlockedAchievements.length} / {ACHIEVEMENTS_LIST.length}</span>
                        </div>
                        <div className="achievements-grid">
                            {ACHIEVEMENTS_LIST.map(ach => {
                                const isUnlocked = unlockedAchievements.includes(ach.id);
                                return (
                                    <div key={ach.id} className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                        <div style={{width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                            {isUnlocked ? ach.icon : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
                                        </div>
                                        <div>
                                            <div style={{fontWeight:600, fontSize:'0.9rem', color: isUnlocked ? '#333' : '#94a3b8'}}>{ach.title}</div>
                                            <div style={{fontSize:'0.75rem', color: isUnlocked ? '#64748b' : '#cbd5e1'}}>{ach.desc}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="modal-actions"><button className="btn-confirm" onClick={() => setAchievementsModal(false)}>Close</button></div>
                    </div>
                </div>
            )}

            {modal.isOpen && modal.feature && (
                <div className="modal-overlay" onClick={(e) => { if(e.target.className === 'modal-overlay') closeModal() }}>
                    <div className="modal-content">
                        {/* HEADER BANDIERA + NOME */}
                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', marginBottom:'8px'}}>
                            {getFlagUrl(modal.feature) && (
                                <img src={getFlagUrl(modal.feature)} alt="flag" style={{width:'40px', borderRadius:'6px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}} />
                            )}
                            <h2 style={{margin:0}}>{modal.feature.properties.name || modal.feature.properties.admin}</h2>
                        </div>
                        <p style={{color:'#64748b', fontSize:'0.9rem', marginBottom:'20px', marginTop:0}}>{modal.feature.properties.continent || 'World'}</p>

                        {modal.type === 'ADD' ? (
                            <>
                                <p style={{marginBottom:'20px', fontSize:'0.95rem', color:'#333'}}>Do you want to mark this place?</p>
                                <div style={{marginBottom:'20px'}}>
                                    <label style={{display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', marginBottom: useDate?'10px':'0', color:'#475569'}}><input type="checkbox" checked={useDate} onChange={e => setUseDate(e.target.checked)} style={{marginRight:'8px', width:'16px', height:'16px'}}/>Add Date</label>
                                    {useDate && <input type="date" className="search-input" value={visitDate} onChange={e => setVisitDate(e.target.value)} style={{textAlign:'center', padding:'8px'}}/>}
                                </div>
                                <div className="modal-actions"><button className="btn-cancel" onClick={closeModal}>Cancel</button><button className="btn-confirm" onClick={confirmAdd} style={{backgroundColor: selectedColor}}>Save</button></div>
                            </>
                        ) : (
                            <>
                                <div style={{margin: '10px 0', padding: '15px', background: '#f8f9fa', borderRadius: '12px', border:'1px solid #eee'}}>
                                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', color:'#333', fontWeight:'600'}}><div style={{width:'12px', height:'12px', borderRadius:'50%', background: visited[getGeoId(modal.feature)]?.color}}></div>Visited</div>
                                    {visited[getGeoId(modal.feature)]?.date && <div style={{fontSize:'0.85rem', color:'#555', marginTop:'8px', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>on {formatDate(visited[getGeoId(modal.feature)].date)}</div>}
                                </div>
                                <div className="modal-actions"><button className="btn-cancel" onClick={closeModal}>Close</button><button className="btn-delete" onClick={confirmDeleteVisit}>Remove</button></div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {notification && (
                <div className="achievement-toast"><div className="toast-icon">{notification.icon}</div><div className="toast-content"><h4>{notification.title}</h4><p>{notification.desc}</p></div></div>
            )}
        </div>
    );
}

// MATH HELPERS
function isPointInFeature(lat, lng, feature) {
    if (feature.geometry.type === 'Polygon') return isPointInPolygon(lat, lng, feature.geometry.coordinates[0]);
    else if (feature.geometry.type === 'MultiPolygon') { for (let i = 0; i < feature.geometry.coordinates.length; i++) { if (isPointInPolygon(lat, lng, feature.geometry.coordinates[i][0])) return true; } }
    return false;
}
function isPointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        let xi = poly[i][1], yi = poly[i][0]; let xj = poly[j][1], yj = poly[j][0];
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export default App;