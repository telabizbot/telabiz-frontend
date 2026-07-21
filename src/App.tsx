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
  const [prices, setPrices] = useState({ pro: { founder: 7000 }, business: { founder: 25000 } });
  const [products, setProducts] = useState([]);
  const [debts, setDebts] = useState([]);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', category: 'Clothing', stock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        if (tg) {
          const data = tg.initDataUnsafe?.user;
          setUser(data);
          if (data?.id) {
            await fetch('https://telabiz-backend.onrender.com/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                telegram_id: data.id,
                username: data.username || '',
                first_name: data.first_name || '',
                last_name: data.last_name || ''
              })
            });
          }
        } else {
          setUser({ first_name: 'Test', id: 'test_123', plan: 'free' });
        }
        setLoading(false);
      } catch (e) {
        console.log('Init error:', e);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const merchantId = user?.id || 'test';
        const productsRes = await fetch(`https://telabiz-backend.onrender.com/api/products?merchant_id=${merchantId}`);
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
        const debtsRes = await fetch(`https://telabiz-backend.onrender.com/api/debts?merchant_id=${merchantId}`);
        const debtsData = await debtsRes.json();
        setDebts(debtsData.debts || []);
        const pricesRes = await fetch('https://telabiz-backend.onrender.com/api/prices');
        const pricesData = await pricesRes.json();
        if (pricesData) setPrices(pricesData);
      } catch (e) {
        console.log('Fetch error:', e);
      }
    };
    fetchData();
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
      const res = await fetch('https://telabiz-backend.onrender.com/api/transactions', {
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
      if (res.ok) {
        alert('✅ Sale saved!');
        setPreview(null);
        setScratchpadText('');
        const debtsRes = await fetch(`https://telabiz-backend.onrender.com/api/debts?merchant_id=${user?.id || 'test'}`);
        const debtsData = await debtsRes.json();
        setDebts(debtsData.debts || []);
      } else {
        alert('❌ Failed to save.');
      }
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
      const res = await fetch('https://telabiz-backend.onrender.com/api/products', {
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
      if (res.ok) {
        alert('✅ Product added!');
        setAddingProduct(false);
        setNewProduct({ name: '', price: '', description: '', category: 'Clothing', stock: 0 });
        const productsRes = await fetch(`https://telabiz-backend.onrender.com/api/products?merchant_id=${user?.id || 'test'}`);
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      } else {
        alert('❌ Failed to add product.');
      }
    } catch (e) {
      alert('Error adding product.');
    }
  };

  const generatePaymentLink = async (productName, price) => {
    try {
      const res = await fetch('https://telabiz-backend.onrender.com/api/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          product: productName,
          merchant_id: user?.id,
          email: 'customer@example.com'
        })
      });
      const data = await res.json();
      if (data.link) {
        window.open(data.link, '_blank');
      } else {
        alert('Failed to generate link.');
      }
    } catch (e) {
      alert('Network error.');
    }
  };
  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading TelaBiz...</div>;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', background: 'white', borderRadius: '16px', minHeight: '90vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>🧵 TelaBiz</h1>
        <span style={{ background: '#e8f5e9', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>Today: ₦45,000</span>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {['Home','Storefront','Assistant','Studio','Pricing','Community','Debts','Help'].map(item => {
          const key = item.toLowerCase();
          return (
            <div key={item} onClick={() => setView(key)} style={{
              padding: '6px 12px', background: view === key ? '#2e7d32' : '#f0f0f0',
              color: view === key ? 'white' : '#333', borderRadius: '20px', cursor: 'pointer', fontSize: '13px'
            }}>{item}</div>
          );
        })}
      </div>

      <div>
        {view === 'home' && (
          <div>
            <h2>Welcome, {user?.first_name || 'Merchant'}!</h2>
            <p>Tap a menu above to start.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button className="btn-save" onClick={() => setView('assistant')}>💼 Log Sale</button>
              <button className="btn-save" style={{ background: '#f57c00' }} onClick={() => setView('studio')}>🎨 Create Image</button>
              <button className="btn-save" style={{ background: '#1976d2' }} onClick={() => setView('storefront')}>🟢 Storefront</button>
            </div>
          </div>
        )}

        {view === 'storefront' && (
          <div>
            <h3>🟢 My Storefront</h3>
            {!addingProduct ? (
              <>
                <button className="btn-save" style={{ background: '#1976d2' }} onClick={() => setAddingProduct(true)}>➕ New Product</button>
                {products.length === 0 ? (
                  <p style={{ marginTop: '16px', color: '#888' }}>No products yet. Add your first product!</p>
                ) : (
                  products.map((p) => (
                    <div key={p.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                      <strong>{p.name}</strong> - ₦{p.price}
                      <div style={{ fontSize: '13px', color: '#666' }}>{p.category}</div>
                      <button className="btn-save" style={{ background: '#f57c00', fontSize: '12px', padding: '6px 10px', marginTop: '4px' }} 
                              onClick={() => generatePaymentLink(p.name, p.price)}>🔗 Generate Link</button>
                    </div>
                  ))
                )}
              </>
            ) : (
              <div>
                <h4>Add Product</h4>
                <input style={{ width: '100%', padding: '10px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '8px' }}
                  placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                <input style={{ width: '100%', padding: '10px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '8px' }}
                  placeholder="Price (₦)" type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                <input style={{ width: '100%', padding: '10px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '8px' }}
                  placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} />
                <textarea style={{ width: '100%', minHeight: '60px', padding: '10px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '8px' }}
                  placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
                <button className="btn-save" onClick={handleAddProduct}>💾 Save</button>
                <button className="btn-save" style={{ background: '#999' }} onClick={() => setAddingProduct(false)}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {view === 'assistant' && (
          <div>
            <h3>💼 Shop Assistant</h3>
            <textarea style={{ width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '12px' }}
              placeholder='e.g. "Sold Agbada to Tunde for 90k, received 40k"'
              value={scratchpadText} onChange={(e) => setScratchpadText(e.target.value)} />
            <button className="btn-save" onClick={handleParse}>⚡ Parse & Preview</button>
            {preview && (
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
                <div style={{ fontSize: '16px' }}>{preview.human_readable}</div>
                {preview.balance !== undefined && (
                  <div style={{ fontWeight: 'bold', color: preview.balance >= 0 ? '#2e7d32' : '#c62828', marginTop: '8px' }}>
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
              <label style={{ fontWeight: '600' }}>Product Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {['Agbada','Dress','Shoe','Bag','Custom'].map(t => (
                  <button key={t} onClick={() => setProductType(t)} style={{
                    padding: '6px 16px', border: productType === t ? '2px solid #2e7d32' : '2px solid #ddd',
                    borderRadius: '20px', background: 'white', cursor: 'pointer', fontSize: '13px'
                  }}>{t}</button>
                ))}
              </div>
            </div>
            {productType !== 'Custom' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: '600' }}>Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {['Blue','Gold','Red','Black','White','Green','Purple','Pink'].map(c => (
                      <button key={c} onClick={() => setColor(c)} style={{
                        padding: '4px 12px', border: color === c ? '2px solid #2e7d32' : '2px solid #ddd',
                        borderRadius: '20px', background: 'white', cursor: 'pointer', fontSize: '12px'
                      }}>{c}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: '600' }}>Style</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {['Modern','Traditional','Luxury','Minimalist'].map(s => (
                      <button key={s} onClick={() => setStyle(s)} style={{
                        padding: '4px 16px', border: style === s ? '2px solid #2e7d32' : '2px solid #ddd',
                        borderRadius: '20px', background: 'white', cursor: 'pointer', fontSize: '13px'
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: '600' }}>Background</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {['Studio','Outdoor','White','Urban'].map(b => (
                      <button key={b} onClick={() => setBackground(b)} style={{
                        padding: '4px 16px', border: background === b ? '2px solid #2e7d32' : '2px solid #ddd',
                        borderRadius: '20px', background: 'white', cursor: 'pointer', fontSize: '13px'
                      }}>{b}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {productType === 'Custom' && (
              <textarea style={{ width: '100%', minHeight: '60px', padding: '12px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '12px' }}
                placeholder="Describe your product..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
            )}
            <button className="btn-save" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? '⏳ Generating...' : '✨ Generate Professional Image'}
            </button>
            {generatedImage && (
              <div style={{ marginTop: '12px' }}>
                <img src={`data:image/png;base64,${generatedImage}`} alt="Generated" style={{ width: '100%', borderRadius: '8px' }} />
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

        {view === 'pricing' && (
          <div>
            <h3>💎 Pricing</h3>
            <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', margin: '8px 0', background: 'white' }}>
              <h4>🚀 Pro</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>₦{prices?.pro?.founder || 7000}<span style={{ fontSize: '14px', fontWeight: 'normal' }}>/month</span></p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
                <li style={{ padding: '4px 0' }}>✅ Unlimited transactions</li>
                <li style={{ padding: '4px 0' }}>✅ Advanced AI images</li>
                <li style={{ padding: '4px 0' }}>✅ Video loops</li>
                <li style={{ padding: '4px 0' }}>✅ Analytics</li>
              </ul>
              <button className="btn-save" onClick={() => alert('Subscribe to Pro - Coming soon!')}>🔒 Subscribe</button>
            </div>

            <div style={{ border: '2px solid #f57c00', padding: '16px', borderRadius: '8px', margin: '8px 0', background: '#fff3e0' }}>
              <h4>💼 Business</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>₦{prices?.business?.founder || 25000}<span style={{ fontSize: '14px', fontWeight: 'normal' }}>/month</span></p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
                <li style={{ padding: '4px 0' }}>✅ Everything in Pro</li>
                <li style={{ padding: '4px 0' }}>✅ Supplier marketplace</li>
                <li style={{ padding: '4px 0' }}>✅ Team accounts</li>
                <li style={{ padding: '4px 0' }}>✅ Custom branding</li>
              </ul>
              <button className="btn-save" style={{ background: '#f57c00' }} onClick={() => alert('Subscribe to Business - Coming soon!')}>🔒 Subscribe</button>
            </div>

            <div style={{ marginTop: '12px', padding: '16px', background: '#e8f5e9', borderRadius: '8px' }}>
              <h4>🆓 Free</h4>
              <p style={{ margin: '4px 0' }}>50 transactions/month • Basic AI images • Basic storefront</p>
              <button className="btn-save" style={{ background: '#1976d2' }} onClick={() => alert('Free plan active!')}>Start Free</button>
            </div>
          </div>
        )}

        {view === 'community' && (
          <div>
            <h3>🌐 Community</h3>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}
              onClick={() => window.open('https://t.me/TelaBizChannel', '_blank')}>
              📢 @TelaBizChannel
            </div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}
              onClick={() => window.open('https://t.me/TelaBizCommunity', '_blank')}>
              💬 @TelaBizCommunity
            </div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}
              onClick={() => window.open('https://t.me/TelaBizBuyers', '_blank')}>
              🛍️ @TelaBizBuyers
            </div>
            <p>Join 5,000+ merchants growing their business!</p>
          </div>
        )}

        {view === 'debts' && (
          <div>
            <h3>💰 Debt Tracking</h3>
            {debts.length === 0 ? (
              <p>No outstanding debts. Great job! 🎉</p>
            ) : (
              debts.map((d) => (
                <div key={d.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                  <strong>{d.customer_name}</strong> owes ₦{d.balance}
                  <div style={{ fontSize: '13px', color: '#666' }}>Total: ₦{d.total_owed} • Paid: ₦{d.amount_paid}</div>
                  <button className="btn-save" style={{ background: '#f57c00', fontSize: '12px', padding: '4px 10px', marginTop: '4px' }}>📤 Send Reminder</button>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'help' && (
          <div>
            <h3>❓ Help</h3>
            <p><strong>💲 Pricing:</strong> Free for 50 transactions/mo. Pro starts at ₦7,000/mo.</p>
            <p><strong>📶 Offline:</strong> Works without internet. Syncs automatically.</p>
            <p><strong>💳 Payments:</strong> Cards (Paystack) & Mobile Money (Flutterwave).</p>
            <p><strong>🌐 Community:</strong> @TelaBizChannel | @TelaBizCommunity | @TelaBizBuyers</p>
            <button className="btn-save" style={{ background: '#d32f2f' }}>🆘 Talk to Human</button>
          </div>
        )}
      </div>

      <style>{`
        .btn-save { width: 100%; padding: 12px; background: #2e7d32; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; }
        .btn-save:active { opacity: 0.8; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

export default App;
