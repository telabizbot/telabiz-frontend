import { useState, useEffect } from 'react';
import { saveOfflineTransaction, syncOfflineData } from './services/offline';

interface PreviewData {
  human_readable: string;
  balance?: number;
  status?: string;
  client?: string;
  product?: string;
  total_amount?: number;
  deposit?: number;
  deadline?: string;
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState('home');
  const [scratchpadText, setScratchpadText] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [productType, setProductType] = useState('Agbada');
  const [color, setColor] = useState('Blue');
  const [style, setStyle] = useState('Modern');
  const [background, setBackground] = useState('Studio');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prices, setPrices] = useState<any>(null);

  useEffect(() => {
    const initTelegram = async () => {
      try {
        const userData = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        setUser(userData);
        if (navigator.onLine) syncOfflineData();
      } catch (e) {
        console.log('Not in Telegram');
      }
    };
    initTelegram();
    window.addEventListener('online', syncOfflineData);
    return () => window.removeEventListener('online', syncOfflineData);
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://telabiz-backend.onrender.com/api/prices');
        const data = await response.json();
        setPrices(data);
      } catch (e) {
        console.log('Could not fetch prices');
      }
    };
    fetchPrices();
  }, []);

  const handleScratchpadSubmit = async () => {
    if (!scratchpadText.trim()) return;
    try {
      const response = await fetch('https://telabiz-backend.onrender.com/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scratchpadText }),
      });
      const result = await response.json();
      setPreview({
        ...result,
        client: result.client || 'Unknown',
        product: result.product || 'Unknown',
        total_amount: result.total_amount || 0,
        deposit: result.deposit || 0,
        deadline: result.deadline || 'Not set'
      });
    } catch (e) {
      await saveOfflineTransaction({ text: scratchpadText, timestamp: Date.now() });
      setPreview({ human_readable: 'Saved offline. Will sync when online.', status: 'offline' });
    }
  };

  const handleSaveTransaction = async () => {
    if (!preview) return;
    try {
      const response = await fetch('https://telabiz-backend.onrender.com/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: preview.client || 'Unknown',
          product: preview.product || 'Unknown',
          total_amount: preview.total_amount || 0,
          deposit: preview.deposit || 0,
          balance: preview.balance || 0,
          deadline: preview.deadline || null,
          timestamp: Date.now()
        })
      });
      if (response.ok) {
        setPreview({ ...preview, status: 'saved' });
        setScratchpadText('');
        alert('✅ Sale saved successfully!');
      }
    } catch (e) {
      await saveOfflineTransaction({
        client: preview.client,
        product: preview.product,
        total_amount: preview.total_amount,
        deposit: preview.deposit,
        balance: preview.balance,
        timestamp: Date.now()
      });
      setPreview({ ...preview, status: 'offline' });
      alert('📴 Saved offline. Will sync when online.');
    }
  };

  const handleGenerateImage = async () => {
    if (productType === 'Custom' && !customPrompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage('');
    try {
      const payload = {
        product_type: productType,
        color: productType === 'Custom' ? '' : color,
        style: productType === 'Custom' ? '' : style,
        background: productType === 'Custom' ? '' : background,
        custom_prompt: customPrompt,
      };
      const response = await fetch('https://telabiz-backend.onrender.com/generate-smart-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.image) setGeneratedImage(data.image);
      else alert('Image generation failed. Please try again.');
    } catch (e) {
      alert('Network error. Check your connection.');
    }
    setIsGenerating(false);
  };

  const renderPricing = () => {
    if (!prices) return <p>Loading prices...</p>;
    const merchantCount = 500;
    let tier = 'regular';
    if (merchantCount <= 500) tier = 'founder';
    else if (merchantCount <= 2000) tier = 'early';
    
    const proPrice = prices.pro?.[tier] || 7000;
    const businessPrice = prices.business?.[tier] || 25000;
    
    return (
      <div className="pricing-container">
        <h3>💎 TelaBiz Pricing</h3>
        {tier === 'founder' && <div className="tier-badge">🔥 Founder's Club - 72% OFF</div>}
        {tier === 'early' && <div className="tier-badge">⭐ Early Adopter - 50% OFF</div>}
        <div className="pricing-cards">
          <div className="pricing-card">
            <h4>Pro</h4>
            <div className="price">₦{proPrice.toLocaleString()}<span>/mo</span></div>
            <ul>
              <li>✅ Unlimited transactions</li>
              <li>✅ Advanced AI images</li>
              <li>✅ Video loops</li>
              <li>✅ Analytics</li>
            </ul>
            <button className="btn-save" onClick={() => alert('Subscribe to Pro')}>🔒 Subscribe</button>
          </div>
          <div className="pricing-card featured">
            <h4>Business</h4>
            <div className="price">₦{businessPrice.toLocaleString()}<span>/mo</span></div>
            <ul>
              <li>✅ Everything Pro</li>
              <li>✅ Supplier marketplace</li>
              <li>✅ Team accounts</li>
              <li>✅ Custom branding</li>
            </ul>
            <button className="btn-save" style={{background:'#f57c00'}}>🔒 Subscribe</button>
          </div>
        </div>
        <div className="free-plan">
          <h4>🆓 Free Plan</h4>
          <p>50 transactions/month • Basic AI images • Basic storefront</p>
          <button className="btn-save" style={{background:'#1976d2'}}>Start Free</button>
        </div>
      </div>
    );
  };

  const renderCommunity = () => (
    <div className="community-container">
      <h3>🌐 TelaBiz Community</h3>
      <div className="community-links">
        <div className="community-item">
          <span>📢 Channel</span>
          <span>@TelaBizChannel</span>
          <button className="btn-save" style={{background:'#1976d2'}}>Join</button>
        </div>
        <div className="community-item">
          <span>💬 Merchant Group</span>
          <span>@TelaBizCommunity</span>
          <button className="btn-save" style={{background:'#1976d2'}}>Join</button>
        </div>
        <div className="community-item">
          <span>🛍️ Buyer Group</span>
          <span>@TelaBizBuyers</span>
          <button className="btn-save" style={{background:'#1976d2'}}>Join</button>
        </div>
      </div>
      <p>Join 5,000+ merchants growing their business!</p>
    </div>
  );

  const renderStudio = () => (
    <div>
      <h3>🎨 Visual Studio</h3>
      <p>Create professional product images in seconds.</p>
      <div className="studio-step">
        <label>Product Type</label>
        <div className="button-group">
          {['Agbada','Dress','Shoe','Bag','Custom'].map(t => (
            <button key={t} className={`option-btn ${productType===t?'active':''}`} onClick={() => setProductType(t)}>{t}</button>
          ))}
        </div>
      </div>
      {productType !== 'Custom' && (
        <>
          <div className="studio-step">
            <label>Color</label>
            <div className="color-grid">
              {['Blue','Gold','Red','Black','White','Green','Purple','Pink'].map(c => (
                <button key={c} className={`color-btn ${color===c?'active':''}`} onClick={() => setColor(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="studio-step">
            <label>Style</label>
            <div className="button-group">
              {['Modern','Traditional','Luxury','Minimalist'].map(s => (
                <button key={s} className={`option-btn ${style===s?'active':''}`} onClick={() => setStyle(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="studio-step">
            <label>Background</label>
            <div className="button-group">
              {['Studio','Outdoor','White','Urban'].map(b => (
                <button key={b} className={`option-btn ${background===b?'active':''}`} onClick={() => setBackground(b)}>{b}</button>
              ))}
            </div>
          </div>
        </>
      )}
      {productType === 'Custom' && (
        <div className="studio-step">
          <label>Describe your product</label>
          <textarea
            className="scratchpad-input"
            placeholder="e.g. A beautiful blue Agbada with gold embroidery, mannequin, studio lighting"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>
      )}
      <button className="btn-save" onClick={handleGenerateImage} disabled={isGenerating}>
        {isGenerating ? '⏳ Generating...' : '✨ Generate Professional Image'}
      </button>
      {generatedImage && (
        <div className="generated-result">
          <img src={`data:image/png;base64,${generatedImage}`} alt="Generated" style={{width:'100%', borderRadius:'12px'}} />
          <div className="result-actions" style={{display:'flex', gap:'8px', marginTop:'12px'}}>
            <button className="btn-save" style={{background:'#1976d2'}}>📥 Save</button>
            <button className="btn-save" style={{background:'#f57c00'}}>📤 Use for Product</button>
            <button className="btn-save" style={{background:'#e53935'}} onClick={handleGenerateImage}>🔄 Regenerate</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container">
      <div className="header">
        <h1>🧵 TelaBiz</h1>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <span className="metrics">Today: ₦45,000</span>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: navigator.onLine ? '#2e7d32' : '#c62828',
            display: 'inline-block'
          }} />
        </div>
      </div>
      <nav className="nav-links">
        <div onClick={() => setView('home')} className="nav-item">🏠 Home</div>
        <div onClick={() => setView('storefront')} className="nav-item">🟢 Storefront</div>
        <div onClick={() => setView('assistant')} className="nav-item">💼 Assistant</div>
        <div onClick={() => setView('studio')} className="nav-item">🎨 Studio</div>
        <div onClick={() => setView('pricing')} className="nav-item">💰 Pricing</div>
        <div onClick={() => setView('community')} className="nav-item">🌐 Community</div>
        <div onClick={() => setView('support')} className="nav-item">❓ Help</div>
      </nav>
      <div className="content">
        {view === 'home' && (
          <div>
            <h2>Welcome, {user?.first_name || 'Merchant'}!</h2>
            <p>Tap a menu above to start.</p>
            <div className="quick-actions">
              <button className="btn-save" onClick={() => setView('assistant')}>💼 Log Sale</button>
              <button className="btn-save" style={{background:'#f57c00'}} onClick={() => setView('studio')}>🎨 Create Image</button>
              <button className="btn-save" style={{background:'#1976d2'}} onClick={() => setView('storefront')}>🟢 Storefront</button>
            </div>
          </div>
        )}
        {view === 'storefront' && (
          <div>
            <h3>🟢 My Storefront</h3>
            <p>Manage products, inventory, and payment links.</p>
            <button className="btn-save" style={{background:'#1976d2'}}>➕ New Product</button>
            <button className="btn-save" style={{background:'#f57c00'}}>🔗 Generate Link</button>
            <button className="btn-save" style={{background:'#2e7d32'}}>📤 Share Storefront</button>
            <div className="storefront-link" style={{marginTop:'16px', padding:'12px', background:'#f5f5f5', borderRadius:'8px'}}>
              <p>🔗 Your Storefront: <strong>telabiz.vercel.app/store/{user?.username || 'yourname'}</strong></p>
            </div>
          </div>
        )}
        {view === 'assistant' && (
          <div>
            <h3>💼 Shop Assistant</h3>
            <textarea
              className="scratchpad-input"
              placeholder='e.g. "Sold Agbada to Tunde for 90k, received 40k"'
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
            />
            <button className="btn-save" onClick={handleScratchpadSubmit}>⚡ Parse & Preview</button>
            {preview && (
              <div className="live-preview">
                <div className="math-line">{preview.human_readable}</div>
                {preview.balance !== undefined && (
                  <div className={`math-result ${preview.balance >= 0 ? 'positive' : 'negative'}`}>
                    Balance: ₦{preview.balance}
                  </div>
                )}
                {preview.status === 'offline' && <div style={{color:'#f57c00'}}>⏳ Offline – will sync later</div>}
                {preview.status === 'saved' && <div style={{color:'#2e7d32'}}>✅ Saved!</div>}
                {!preview.status && preview.balance !== undefined && (
                  <button className="btn-save" onClick={handleSaveTransaction}>✅ Save to Ledger</button>
                )}
              </div>
            )}
            <div className="customer-section" style={{marginTop:'16px'}}>
              <h4>👥 Recent Customers</h4>
              <div className="customer-list">
                <div className="customer-item">Tunde - ₦50,000 balance</div>
                <div className="customer-item">Chidi - ₦30,000 balance</div>
                <div className="customer-item">Amara - ₦0 balance</div>
              </div>
              <button className="btn-save" style={{background:'#1976d2'}}>📋 View All Customers</button>
            </div>
          </div>
        )}
        {view === 'studio' && renderStudio()}
        {view === 'pricing' && renderPricing()}
        {view === 'community' && renderCommunity()}
        {view === 'support' && (
          <div>
            <h3>❓ Help & Support</h3>
            <div className="faq-list">
              <p><strong>💲 Pricing:</strong> Free for 50 transactions/mo. Pro starts at ₦7,000/mo.</p>
              <p><strong>📶 Offline:</strong> Works without internet. Syncs automatically.</p>
              <p><strong>💳 Payments:</strong> Cards (Paystack) & Mobile Money (Flutterwave).</p>
              <p><strong>📏 Measurements:</strong> Save custom sizes in Customer Vault.</p>
              <p><strong>🌐 Community:</strong> @TelaBizChannel | @TelaBizCommunity | @TelaBizBuyers</p>
            </div>
            <button className="btn-save" style={{background:'#d32f2f'}}>🆘 Talk to Human</button>
            <div className="quick-help" style={{marginTop:'16px'}}>
              <button className="btn-save" style={{background:'#1976d2'}}>📖 View Tutorials</button>
              <button className="btn-save" style={{background:'#f57c00'}}>📞 Contact Support</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
