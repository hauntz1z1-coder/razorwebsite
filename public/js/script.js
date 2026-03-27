// ===== Sound Effects System =====
const optionSound = new Audio('/sounds/options-sound.mp3');
optionSound.volume = 0.5;
optionSound.preload = 'auto';

function playOptionSound() {
    // Clone the audio to allow overlapping sounds
    const sound = optionSound.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(() => {});
}

// Track elements that already have sound attached
const soundAttached = new WeakSet();

// Add sound effects to all interactive elements
function initSoundEffects() {
    // All clickable elements
    const clickableSelectors = [
        '.btn', 
        'button', 
        '.quantity-btn',
        '.nav-list a', 
        '.mobile-nav-list a', 
        '.footer-links a',
        '.social-links a',
        '.cart-icon',
        '.logo',
        '.product-card', 
        '.player-card', 
        '.tournament-card',
        '.hof-card',
        '.mobile-menu-btn',
        '[onclick]',
        'a[href]'
    ];
    
    clickableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (!soundAttached.has(el)) {
                el.addEventListener('click', playOptionSound);
                soundAttached.add(el);
            }
        });
    });
    
    // Select elements
    document.querySelectorAll('select').forEach(select => {
        if (!soundAttached.has(select)) {
            select.addEventListener('change', playOptionSound);
            soundAttached.add(select);
        }
    });
    
    // Input focus
    document.querySelectorAll('input, textarea').forEach(input => {
        if (!soundAttached.has(input)) {
            input.addEventListener('focus', playOptionSound);
            soundAttached.add(input);
        }
    });
}

// ===== Mobile Menu Toggle =====
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    });
}

// ===== Header Scroll Effect =====
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.background = 'rgba(0, 0, 0, 0.98)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.5)';
    } else {
        header.style.background = 'rgba(0, 0, 0, 0.95)';
        header.style.boxShadow = 'none';
    }
});

// ===== Scroll Reveal Animation =====
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    
    reveals.forEach(element => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const revealPoint = 150;
        
        if (elementTop < windowHeight - revealPoint) {
            element.classList.add('active');
        }
    });
}

window.addEventListener('scroll', revealOnScroll);
revealOnScroll(); // Initial check

// ===== Cart Functionality =====
let cart = JSON.parse(localStorage.getItem('razorCart')) || [];

function updateCartCount() {
    const cartCounts = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cartCounts.forEach(count => {
        count.textContent = totalItems;
    });
}

function addToCart(productId, productName, productPrice) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1
        });
    }
    
    localStorage.setItem('razorCart', JSON.stringify(cart));
    updateCartCount();
    showNotification(`${productName} adicionado ao carrinho!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('razorCart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('razorCart', JSON.stringify(cart));
            renderCart();
        }
    }
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    const cartEmpty = document.getElementById('cart-empty');
    
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        if (cartEmpty) cartEmpty.style.display = 'block';
        if (cartItemsContainer) cartItemsContainer.style.display = 'none';
        if (cartSummary) cartSummary.style.display = 'none';
        return;
    }
    
    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (cartSummary) cartSummary.style.display = 'block';
    
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image"></div>
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">R$ ${item.price.toFixed(2)}</p>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" aria-label="Remover item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
    
    // Update summary
    const subtotal = getCartTotal();
    const shipping = subtotal > 200 ? 0 : 25;
    
    // Check for applied coupon
    const appliedCoupon = typeof window.getAppliedCoupon === 'function' ? window.getAppliedCoupon() : null;
    let discount = 0;
    let discountHtml = '';
    
    if (appliedCoupon) {
        discount = subtotal * (appliedCoupon.discount / 100);
        discountHtml = `
            <div class="summary-row discount-row">
                <span>Desconto (${appliedCoupon.code})</span>
                <span>- R$ ${discount.toFixed(2)}</span>
            </div>
        `;
    }
    
    const total = subtotal - discount + shipping;
    
    const summaryContent = document.getElementById('summary-content');
    if (summaryContent) {
        summaryContent.innerHTML = `
            <div class="summary-row">
                <span>Subtotal</span>
                <span>R$ ${subtotal.toFixed(2)}</span>
            </div>
            ${discountHtml}
            <div class="summary-row">
                <span>Frete</span>
                <span>${shipping === 0 ? 'Gratis' : `R$ ${shipping.toFixed(2)}`}</span>
            </div>
            <div class="summary-row total">
                <span>Total</span>
                <span>R$ ${total.toFixed(2)}</span>
            </div>
        `;
    }
}

// ===== Notification System =====
function showNotification(message) {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #1a1a1a;
        color: #fff;
        padding: 16px 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        border: 1px solid #44ff00;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Add animation keyframes if not already added
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Discord Webhook Configuration =====
const DISCORD_WEBHOOKS = {
    orders: 'https://canary.discord.com/api/webhooks/1482221033653141524/_2KjX-bT8QJVgt2NTXe6h5sDgWuGa8XYB8hU1SxGqvnJRG2r6FCsS2ud27gbeKzF_hu9',
    recruitment: 'https://canary.discord.com/api/webhooks/1484414808123117680/mnXpaj9fAERU1HC-yMkxcG4MTl20WEhFGAWgFeEnnO11qPeiqZT01J_FiZ306WTX6OwT'
};

// ===== Send to Discord Webhook =====
async function sendToDiscord(webhookUrl, embed) {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });
        
        if (!response.ok) {
            console.error('Erro ao enviar para Discord:', response.status);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Erro ao enviar para Discord:', error);
        return false;
    }
}

// ===== ViaCEP API Integration =====
async function searchCEP(cep) {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
        return null;
    }
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (data.erro) {
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
}

async function handleCEPInput(event) {
    const cepInput = event.target;
    const cep = cepInput.value;
    
    // Format CEP
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length <= 5) {
        cepInput.value = cleanCEP;
    } else {
        cepInput.value = cleanCEP.slice(0, 5) + '-' + cleanCEP.slice(5, 8);
    }
    
    if (cleanCEP.length === 8) {
        const addressData = await searchCEP(cleanCEP);
        
        if (addressData) {
            const streetInput = document.getElementById('checkout-street');
            const neighborhoodInput = document.getElementById('checkout-neighborhood');
            const cityInput = document.getElementById('checkout-city');
            const stateInput = document.getElementById('checkout-state');
            
            if (streetInput) streetInput.value = addressData.logradouro || '';
            if (neighborhoodInput) neighborhoodInput.value = addressData.bairro || '';
            if (cityInput) cityInput.value = addressData.localidade || '';
            if (stateInput) stateInput.value = addressData.uf || '';
            
            // Focus on number field
            const numberInput = document.getElementById('checkout-number');
            if (numberInput) numberInput.focus();
            
            playOptionSound();
            showNotification('Endereco encontrado!');
        } else {
            showNotification('CEP nao encontrado. Preencha manualmente.');
        }
    }
}

// ===== Handle Checkout Form Submission =====
async function handleCheckout(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = document.getElementById('checkout-btn');
    const originalBtnText = submitBtn.textContent;
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';
    
    // Get form data
    const customerData = {
        name: document.getElementById('checkout-name').value,
        email: document.getElementById('checkout-email').value,
        whatsapp: document.getElementById('checkout-whatsapp').value,
        cpf: document.getElementById('checkout-cpf').value,
        cep: document.getElementById('checkout-cep')?.value || '',
        street: document.getElementById('checkout-street')?.value || '',
        number: document.getElementById('checkout-number')?.value || '',
        complement: document.getElementById('checkout-complement')?.value || '',
        neighborhood: document.getElementById('checkout-neighborhood')?.value || '',
        city: document.getElementById('checkout-city')?.value || '',
        state: document.getElementById('checkout-state')?.value || ''
    };
    
    // Get cart data
    const cartItems = JSON.parse(localStorage.getItem('razorCart')) || [];
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 200 ? 0 : 25;
    
    // Check for applied coupon
    const appliedCoupon = typeof window.getAppliedCoupon === 'function' ? window.getAppliedCoupon() : null;
    let discount = 0;
    let couponInfo = 'Nenhum cupom aplicado';
    
    if (appliedCoupon) {
        discount = subtotal * (appliedCoupon.discount / 100);
        couponInfo = `${appliedCoupon.code} (-${appliedCoupon.discount}% = -R$ ${discount.toFixed(2)})`;
    }
    
    const total = subtotal - discount + shipping;
    
    // Generate order ID
    const orderId = 'RZR-' + Date.now().toString(36).toUpperCase();
    
    // Create items list for Discord
    const itemsList = cartItems.map(item => 
        `- ${item.name} x${item.quantity} - R$ ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');
    
// Create address string
const addressStr = customerData.street 
    ? `${customerData.street}, ${customerData.number}${customerData.complement ? ' - ' + customerData.complement : ''}\n${customerData.neighborhood} - ${customerData.city}/${customerData.state}\nCEP: ${customerData.cep}`
    : 'Nao informado';

// Create Discord embed for order
const orderEmbed = {
  title: '🛒 Novo Pedido Recebido!',
  color: 0x44ff00, // Green color
  fields: [
  {
  name: '📋 Pedido',
  value: `\`${orderId}\``,
  inline: true
  },
  {
  name: '💰 Total',
  value: `R$ ${total.toFixed(2)}`,
  inline: true
  },
  {
  name: '����� Frete',
  value: shipping === 0 ? 'Gratis' : `R$ ${shipping.toFixed(2)}`,
  inline: true
  },
  {
  name: '👤 Cliente',
  value: customerData.name,
  inline: true
  },
  {
  name: '📧 E-mail',
  value: customerData.email,
  inline: true
  },
  {
  name: '📱 WhatsApp',
  value: customerData.whatsapp,
  inline: true
  },
  {
  name: '🪪 CPF',
  value: customerData.cpf,
  inline: true
  },
  {
  name: '📍 Endereco de Entrega',
  value: addressStr,
  inline: false
  },
{
	  name: '🏷️ Cupom de Desconto',
	  value: couponInfo,
	  inline: true
	  },
	  {
	  name: '📦 Itens do Pedido',
	  value: itemsList || 'Nenhum item',
	  inline: false
	  }
	  ],
  footer: {
  text: 'RAZOR Shop - Sistema de Pedidos'
  },
  timestamp: new Date().toISOString()
  };
    
    // Send to Discord
    const success = await sendToDiscord(DISCORD_WEBHOOKS.orders, orderEmbed);
    
    if (success) {
        // Save order to localStorage for confirmation page
        const orderData = {
            orderId: orderId,
            customer: customerData,
            items: cartItems,
            subtotal: subtotal,
            discount: discount,
            coupon: appliedCoupon ? appliedCoupon.code : null,
            shipping: shipping,
            total: total,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('razorLastOrder', JSON.stringify(orderData));
        
        // Clear cart
        localStorage.removeItem('razorCart');
        cart = [];
        updateCartCount();
        
        // Redirect to confirmation page
        window.location.href = 'order-confirmation.html';
    } else {
        showNotification('Erro ao processar pedido. Tente novamente.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// ===== Handle Join Form Submission =====
async function handleJoinSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    
    // Get form data
    const formData = {
        role: document.querySelector('input[name="role"]:checked').value,
        nickname: document.getElementById('nickname').value,
        discord: document.getElementById('discord').value,
        age: document.getElementById('age').value,
        region: document.getElementById('region').value,
        tracker: document.getElementById('tracker').value,
        experience: document.getElementById('experience').value || 'Nao informado',
        motivation: document.getElementById('motivation').value
    };
    
    // Get region display name
    const regionSelect = document.getElementById('region');
    const regionName = regionSelect.options[regionSelect.selectedIndex].text;
    
    // Get role display name
    const roleDisplay = formData.role === 'player' ? 'PLAYER' : 'STAFF';
    const roleEmoji = formData.role === 'player' ? '🎮' : '👥';
    const embedColor = formData.role === 'player' ? 0x44ff00 : 0xffa500; // Green for player, Orange for staff
    
    // Create Discord embed for recruitment
    const recruitEmbed = {
        title: `📝 Nova Inscricao - ${roleDisplay}!`,
        color: embedColor,
        fields: [
            {
                name: `${roleEmoji} Tipo de Inscricao`,
                value: `**${roleDisplay}**`,
                inline: false
            },
            {
                name: '🎮 Nickname',
                value: formData.nickname,
                inline: true
            },
            {
                name: '💬 Discord',
                value: formData.discord,
                inline: true
            },
            {
                name: '🎂 Idade',
                value: `${formData.age} anos`,
                inline: true
            },
            {
                name: '📍 Regiao',
                value: regionName,
                inline: true
            },
            {
                name: '📊 Fortnite Tracker',
                value: `[Ver Perfil](${formData.tracker})`,
                inline: false
            },
            {
                name: '🏆 Experiencia Competitiva',
                value: formData.experience,
                inline: false
            },
            {
                name: '💭 Motivacao',
                value: formData.motivation,
                inline: false
            }
        ],
        footer: {
            text: 'RAZOR Team - Sistema de Recrutamento'
        },
        timestamp: new Date().toISOString()
    };
    
    // Send to Discord
    const success = await sendToDiscord(DISCORD_WEBHOOKS.recruitment, recruitEmbed);
    
    if (success) {
        showNotification('Inscricao enviada com sucesso! Entraremos em contato pelo Discord.');
        form.reset();
    } else {
        showNotification('Erro ao enviar inscricao. Tente novamente.');
    }
    
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    renderCart();
    initSoundEffects();
});

// Re-initialize sound effects when content changes dynamically
const observer = new MutationObserver(() => {
    initSoundEffects();
});

observer.observe(document.body, { childList: true, subtree: true });
