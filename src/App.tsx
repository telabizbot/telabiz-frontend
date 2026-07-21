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
  const [products, setProducts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({ revenue: 0, transactions: 0 });
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', category: 'Clothing', stock: 0 });

  useEffect(() => {
    const initTelegram = async () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          const userData = tg.initDataUnsafe?.user;
          setUser(userData);
          if (userData && userData.id) {
            await fetch('https://telabiz-backend.onrender.com/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                telegram_id: userData.id,
                username: userData.username || '',
                first_name: userData.first_name || '',
                last_name: userData.last_name || ''
              })
            });
          }
        } else {
          setUser({ first_name: "Test", id: 123, plan: "free" });
        }
        if (navigator.onLine) syncOfflineData();
      } catch (e) {
        console.log('Error:', e);
      }
    };
    initTelegram();
    window.addEventListener('online', syncOfflineData);
    return () => window.removeEventListener('online', syncOfflineData);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`https://telabiz-backend.onrender.com/api/products?merchant_id=${user?.id || 'test'}`);
        const data = await response.json();
        setProducts(data.products || []);
      } catch (e) {
        console.log('Error fetching products:', e);
      }
    };
    if (user) fetchProducts();
  }, [user]);

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
          merchant_id: user?.id || 'test',
          timestamp: Date.now()
        })
      });
      if (response.ok) {
        setPreview({ ...preview, status: 'saved' });
        setScratchpadText('');
        alert('✅ Sale saved successfully!');
      } else {
        alert('❌ Failed to save. Please try again.');
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

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Please enter name and price.');
      return;
    }
    try {
      const response = await fetch('https://telabiz-backend.onrender.com/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: user?.id || 'test',
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          category: newProduct.category,
          stock: parseInt(newProduct.stock as any) || 0,
          images: [],
          variations: []
        })
      });
      if (response.ok) {
        alert('✅ Product added!');
        setAddingProduct(false);
        setNewProduct({ name: '', price: '', description: '', category: 'Clothing', stock: 0 });
        const fetchRes = await fetch(`https://telabiz-backend.onrender.com/api/products?merchant_id=${user?.id || 'test'}`);
        const data = await fetchRes.json();
        setProducts(data.products || []);
      } else {
        alert('❌ Failed to add product.');
      }
    } catch (e) {
      alert('Network error. Please try again.');
    }
  };

  const generatePaymentLink = async (productName: string, price: number) => {
    try {
      const response = await fetch('https://telabiz-backend.onrender.com/api/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          product: productName,
          merchant_id: user?.id,
          email: 'customer@example.com'
        })
      });
      const data = await response.json();
      if (data.link) {
        window.open(data.link, '_blank');
      } else {
        alert('Failed to generate link.');
      }
    } catch (e) {
      alert('Network error.');
    }
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
            <button className="btn-save" style={{background:'#f57c00'}} onClick={() => alert('Subscribe to Business')}>🔒 Subscribe</button>
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
          <button className="btn-save" style={{background:'#1976d2'}} onClick={() => window.open('https://t.me/TelaBizChannel', '_blank')}>Join</button>
        </div>
        <div className="community-item">
          <span>💬 Merchant Group</span>
          <span>@TelaBizCommunity</span>
          <button className="btn-save" style={{background:'#1976d2'}} onClick={() => window.open('https://t.me/TelaBizCommunity', '_blank')}>Join</button>
        </div>
        <div className="community-item">
          <span>🛍️ Buyer Group</span>
          <span>@TelaBizBuyers</span>
          <button className="btn-save" style={{background:'#1976d2'}} onClick={() => window.open('https://t.me/TelaBizBuyers', '_blank')}>Join</button>
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
            <button className="btn-save" style={{background:'#1976d2'}} onClick={() => {
              const link = document.createElement('a');
              link.download = 'product.png';
              link.href = `data:image/png;base64,${generatedImage}`;
              link.click();
            }}>📥 Save</button>
            <button className="btn-save" style={{background:'#f57c00'}} onClick={() => alert('Open product form to use this image')}>📤 Use for Product</button>
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
        <div onClick={() => setView('analytics')} className="nav-item">📊 Analytics</div>
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
            {!addingProduct ? (
              <>
                <button className="btn-save" style={{background:'#1976d2'}} onClick={() => setAddingProduct(true)}>
                  ➕ New Product
                </button>
                <div className="product-list">
                  {products.length === 0 ? (
                    <p>No products yet. Add your first product!</p>
                  ) : (
                    products.map((p: any) => (
                      <div key={p.id} className="product-item" style={{borderBottom:'1px solid #eee', padding:'10px 0'}}>
                        <strong>{p.name}</strong> - ₦{p.price}
                        <button className="btn-save" style={{background:'#f57c00', fontSize:'12px', padding:'4px 10px', marginTop:'4px'}} 
                                onClick={() => generatePaymentLink(p.name, p.price)}>
                          🔗 Generate Link
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div>
                <h4>Add New Product</h4>
                <input className="scratchpad-input" placeholder="Product Name" 
                       value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                <input className="scratchpad-input" placeholder="Price (₦)" type="number"
                       value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                <input className="scratchpad-input" placeholder="Category" 
                       value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} />
                <textarea className="scratchpad-input" placeholder="Description"
                          value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
                <button className="btn-save" onClick={handleAddProduct}>💾 Save Product</button>
                <button className="btn-save" style={{background:'#999'}} onClick={() => setAddingProduct(false)}>Cancel</button>
              </div>
            )}
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
              </d
git add src/App.tsx
git commit -m "fix: correct App.tsx with proper assistant view"
git push origin main












cat > src/App.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { saveOfflineTransaction, syncOfflineData } from './services/offline';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [scratchpadText, setScratchpadText] = useState('');
  const [preview, setPreview] = useState(null);
  const [productType, setProductType] = useState('Agbada');
  const [color, setColor] = useState('Blue');
  const [style, setStyle] = useState('Modern');
  const [background, setBackground] = useState('Studio');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prices, setPrices] = useState(null);
  const [products, setProducts] = useState([]);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', category: 'Clothing', stock: 0 });

  useEffect(() => {
    const init = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        if (tg) {
          const data = tg.initDataUnsafe?.user;
          setUser(data);
        }
      } catch (e) {
        console.log('Error:', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://telabiz-backend.onrender.com/api/prices');
        const data = await res.json();
        setPrices(data);
      } catch (e) {
        console.log('Error fetching prices');
      }
    };
    fetchPrices();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`https://telabiz-backend.onrender.com/api/products?merchant_id=${user?.id || 'test'}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch (e) {
        console.log('Error fetching products');
      }
    };
    if (user) fetchProducts();
  }, [user]);

  const handleParse = async () => {
    if (!scratchpadText.trim()) return;
    try {
      const res = await fetch('https://telabiz-backend.onrender.com/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scratchpadText }),
      });
      const data = await res.json();
      setPreview(data);
    } catch (e) {
      alert('Error parsing. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    try {
      await fetch('https://telabiz-backend.onrender.com/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: preview.client || 'Unknown',
          product: preview.product || 'Unknown',
          total_amount: preview.total_amount || 0,
          deposit: preview.deposit || 0,
          balance: preview.balance || 0,
          merchant_id: user?.id || 'test'
        })
      });
      alert('✅ Sale saved!');
      setPreview(null);
      setScratchpadText('');
    } catch (e) {
      alert('Error saving. Please try again.');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        product_type: productType,
        color: productType === 'Custom' ? '' : color,
        style: productType === 'Custom' ? '' : style,
        background: productType === 'Custom' ? '' : background,
        custom_prompt: customPrompt,
      };
      const res = await fetch('https://telabiz-backend.onrender.com/generate-smart-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.image) setGeneratedImage(data.image);
      else alert('Image generation failed.');
    } catch (e) {
      alert('Network error.');
    }
    setIsGenerating(false);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Please enter name and price.');
      return;
    }
    try {
      await fetch('https://telabiz-backend.onrender.com/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: user?.id || 'test',
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          category: newProduct.category,
          stock: parseInt(newProduct.stock) || 0,
          images: [],
          variations: []
        })
      });
      alert('✅ Product added!');
      setAddingProduct(false);
      setNewProduct({ name: '', price: '', description: '', category: 'Clothing', stock: 0 });
      const res = await fetch(`https://telabiz-backend.onrender.com/api/products?merchant_id=${user?.id || 'test'}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      alert('Error adding product.');
    }
  };

  const renderPricing = () => {
    if (!prices) return <p>Loading...</p>;
    return (
      <div>
        <h3>💎 Pricing</h3>
        <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', margin: '8px 0' }}>
          <h4>Pro</h4>
          <p>₦{prices.pro?.founder || 7000}/month</p>
          <button className="btn-save">Subscribe</button>
        </div>
        <div style={{ border: '1px solid #f57c00', padding: '16px', borderRadius: '8px', background: '#fff3e0' }}>
          <h4>Business</h4>
          <p>₦{prices.business?.founder || 25000}/month</p>
          <button className="btn-save" style={{ background: '#f57c00' }}>Subscribe</button>
        </div>
        <div style={{ marginTop: '12px', padding: '12px', background: '#e8f5e9', borderRadius: '8px' }}>
          <h4>🆓 Free</h4>
          <p>50 transactions/month</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', background: 'white', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>🧵 TelaBiz</h1>
        <span style={{ background: '#e8f5e9', padding: '4px 12px', borderRadius: '20px', fontSize: '14px' }}>Today: ₦45,000</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '16px 0' }}>
        {['Home','Storefront','Assistant','Studio','Pricing','Community','Help'].map(item => (
          <div key={item} onClick={() => setView(item.toLowerCase())} style={{
            padding: '8px 12px', background: view === item.toLowerCase() ? '#2e7d32' : '#f0f0f0',
            color: view === item.toLowerCase() ? 'white' : '#333', borderRadius: '20px', cursor: 'pointer', fontSize: '14px'
          }}>{item}</div>
        ))}
      </div>

      <div>
        {view === 'home' && (
          <div>
            <h2>Welcome, {user?.first_name || 'Merchant'}!</h2>
            <p>Tap a menu above to start.</p>
            <button className="btn-save" onClick={() => setView('assistant')}>💼 Log Sale</button>
            <button className="btn-save" style={{ background: '#f57c00' }} onClick={() => setView('studio')}>🎨 Create Image</button>
          </div>
        )}

        {view === 'assistant' && (
          <div>
            <h3>💼 Shop Assistant</h3>
            <textarea style={{ width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #ddd', borderRadius: '12px' }}
              placeholder='e.g. "Sold Agbada to Tunde for 90k, received 40k"'
              value={scratchpadText} onChange={(e) => setScratchpadText(e.target.value)} />
            <button className="btn-save" onClick={handleParse}>⚡ Parse & Preview</button>
            {preview && (
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', marginTop: '12px' }}>
                <div>{preview.human_readable}</div>
                {preview.balance !== undefined && (
                  <div style={{ fontWeight: 'bold', color: preview.balance >= 0 ? '#2e7d32' : '#c62828' }}>
                    Balance: ₦{preview.balance}
                  </div>
                )}
                <button className="btn-save" onClick={handleSave}>✅ Save to Ledger</button>
              </div>
            )}
          </div>
        )}

        {view === 'studio' && (
          <div>
            <h3>🎨 Visual Studio</h3>
            <p>Create professional product images.</p>
            <div style={{ marginBottom: '12px' }}>
              <label>Product Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Agbada','Dress','Shoe','Bag','Custom'].map(t => (
                  <button key={t} onClick={() => setProductType(t)} style={{
                    padding: '6px 16px', border: productType === t ? '2px solid #2e7d32' : '2px solid #ddd',
                    borderRadius: '20px', background: 'white', cursor: 'pointer'
                  }}>{t}</button>
                ))}
              </div>
            </div>
            {productType !== 'Custom' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label>Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Blue','Gold','Red','Black','White','Green','Purple','Pink'].map(c => (
                      <button key={c} onClick={() => setColor(c)} style={{
                        padding: '4px 12px', border: color === c ? '2px solid #2e7d32' : '2px solid #ddd',
                        borderRadius: '20px', background: 'white', cursor: 'pointer'
                      }}>{c}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>Style</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Modern','Traditional','Luxury','Minimalist'].map(s => (
                      <button key={s} onClick={() => setStyle(s)} style={{
                        padding: '4px 16px', border: style === s ? '2px solid #2e7d32' : '2px solid #ddd',
                        borderRadius: '20px', background: 'white', cursor: 'pointer'
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>Background</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Studio','Outdoor','White','Urban'].map(b => (
                      <button key={b} onClick={() => setBackground(b)} style={{
                        padding: '4px 16px', border: background === b ? '2px solid #2e7d32' : '2px solid #ddd',
                        borderRadius: '20px', background: 'white', cursor: 'pointer'
                      }}>{b}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {productType === 'Custom' && (
              <textarea style={{ width: '100%', minHeight: '60px', padding: '12px', border: '2px solid #ddd', borderRadius: '12px' }}
                placeholder="Describe your product..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
            )}
            <button className="btn-save" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? '⏳ Generating...' : '✨ Generate Professional Image'}
            </button>
            {generatedImage && (
              <div style={{ marginTop: '12px' }}>
                <img src={`data:image/png;base64,${generatedImage}`} alt="Generated" style={{ width: '100%', borderRadius: '12px' }} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button className="btn-save" style={{ background: '#1976d2' }} onClick={() => {
                    const link = document.createElement('a');
                    link.download = 'product.png';
                    link.href = `data:image/png;base64,${generatedImage}`;
                    link.click();
                  }}>📥 Save</button>
                  <button className="btn-save" style={{ background: '#f57c00' }} onClick={handleGenerate}>🔄 Regenerate</button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'storefront' && (
          <div>
            <h3>🟢 Storefront</h3>
            {!addingProduct ? (
              <>
                <button className="btn-save" style={{ background: '#1976d2' }} onClick={() => setAddingProduct(true)}>➕ New Product</button>
                {products.length === 0 ? <p>No products yet.</p> : products.map((p) => (
                  <div key={p.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                    <strong>{p.name}</strong> - ₦{p.price}
                    <button className="btn-save" style={{ background: '#f57c00', fontSize: '12px', padding: '4px 10px' }}>🔗 Generate Link</button>
                  </div>
                ))}
              </>
            ) : (
              <div>
                <h4>Add Product</h4>
                <input style={{ width: '100%', padding: '12px', border: '2px solid #ddd', borderRadius: '12px', marginBottom: '8px' }}
                  placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                <input style={{ width: '100%', padding: '12px', border: '2px solid #ddd', borderRadius: '12px', marginBottom: '8px' }}
                  placeholder="Price (₦)" type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                <button className="btn-save" onClick={handleAddProduct}>💾 Save</button>
                <button className="btn-save" style={{ background: '#999' }} onClick={() => setAddingProduct(false)}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {view === 'pricing' && renderPricing()}

        {view === 'community' && (
          <div>
            <h3>🌐 Community</h3>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '8px' }}>
              📢 @TelaBizChannel
            </div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '8px' }}>
              💬 @TelaBizCommunity
            </div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '8px' }}>
              🛍️ @TelaBizBuyers
            </div>
            <p>Join 5,000+ merchants growing their business!</p>
          </div>
        )}

        {view === 'help' && (
          <div>
            <h3>❓ Help</h3>
            <p><strong>💲 Pricing:</strong> Free for 50 transactions/mo. Pro starts at ₦7,000/mo.</p>
            <p><strong>📶 Offline:</strong> Works without internet.</p>
            <p><strong>💳 Payments:</strong> Cards & Mobile Money.</p>
            <button className="btn-save" style={{ background: '#d32f2f' }}>🆘 Talk to Human</button>
          </div>
        )}
      </div>

      <style>{`
        .btn-save { width: 100%; padding: 12px; background: #2e7d32; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; }
        .btn-save:active { opacity: 0.8; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        label { font-weight: 600; display: block; margin-bottom: 4px; }
      `}</style>
    </div>
  );
}

export default App;
