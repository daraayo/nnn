// Fetch cryptocurrency data
async function fetchCryptoData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching crypto data:', error);
    }
}

// WebSocket setup for real-time updates
const socket = new WebSocket('wss://streamer.cryptocompare.com/v2?api_key=YOUR_API_KEY');

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.TYPE === '5') {
        updateCryptoPrice(data.FROMSYMBOL, data.PRICE);
    }
};

function updateCryptoPrice(symbol, price) {
    const cryptoCard = document.querySelector(`.crypto-card[data-symbol="${symbol}"]`);
    if (cryptoCard) {
        cryptoCard.querySelector('.price').textContent = `Price: $${price.toFixed(2)}`;
    }
}

// Display cryptocurrency data
async function displayCryptoData() {
    const cryptoList = document.getElementById('crypto-list');
    const data = await fetchCryptoData();
    cryptoList.innerHTML = '';
    data.forEach(coin => {
        const card = document.createElement('div');
        card.classList.add('crypto-card');
        card.setAttribute('data-symbol', coin.symbol.toUpperCase());
        card.innerHTML = `
            <h3>${coin.name}</h3>
            <p class="price">Price: $${coin.current_price.toFixed(2)}</p>
            <p>24h Change: ${coin.price_change_percentage_24h.toFixed(2)}%</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = `crypto-details.html?id=${coin.id}`;
        });
        cryptoList.appendChild(card);
    });
    subscribeToUpdates(data);
}

function subscribeToUpdates(data) {
    const symbols = data.map(coin => coin.symbol.toUpperCase());
    const subRequest = {
        "action": "SubAdd",
        "subs": symbols.map(sym => `5~CCCAGG~${sym}~USD`)
    };
    socket.send(JSON.stringify(subRequest));
}

// Market Overview Chart (using TradingView's Lightweight Charts)
const chartContainer = document.getElementById('chart');
const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.offsetWidth,
    height: window.innerWidth > 768 ? 300 : 200,
    layout: {
        backgroundColor: '#2B2B43',
        textColor: '#D9D9D9',
    },
    grid: {
        vertLines: { color: '#404040' },
        horzLines: { color: '#404040' },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#cccccc' },
    timeScale: { borderColor: '#cccccc' },
});

const candleSeries = chart.addCandlestickSeries();

// Fetch historical data and update chart
async function updateChart() {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30');
    const data = await response.json();
    const chartData = data.map(d => ({
        time: d[0] / 1000,
        open: d[1],
        high: d[2],
        low: d[3],
        close: d[4]
    }));
    candleSeries.setData(chartData);
}

// News Feed with real-time updates and filtering
class NewsManager {
    constructor(container) {
        this.container = container;
        this.newsItems = [];
    }

    async fetchNews(category = '') {
        const response = await fetch(`https://cryptonews-api.com/api/v1?tickers=${category}&items=50&token=YOUR_API_KEY`);
        const data = await response.json();
        this.newsItems = data.data;
        this.displayNews();
    }

    displayNews() {
        this.container.innerHTML = '';
        this.newsItems.forEach(item => {
            const newsElement = document.createElement('li');
            newsElement.innerHTML = `
                <h3>${item.title}</h3>
                <p>${window.innerWidth > 480 ? item.text : item.text.slice(0, 100) + '...'}</p>
                <a href="${item.news_url}" target="_blank">Read more</a>
            `;
            this.container.appendChild(newsElement);
        });
    }

    filterNews(keyword) {
        const filteredNews = this.newsItems.filter(item => 
            item.title.toLowerCase().includes(keyword.toLowerCase()) || 
            item.text.toLowerCase().includes(keyword.toLowerCase())
        );
        this.newsItems = filteredNews;
        this.displayNews();
    }
}

const newsManager = new NewsManager(document.getElementById('news-list'));

// Cryptocurrency Conversion Calculator
class CryptoCalculator {
    constructor(fromSelect, toSelect, amountInput, resultDiv) {
        this.fromSelect = fromSelect;
        this.toSelect = toSelect;
        this.amountInput = amountInput;
        this.resultDiv = resultDiv;
    }

    async populateCurrencies() {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
        const data = await response.json();
        
        data.forEach(coin => {
            const option = document.createElement('option');
            option.value = coin.id;
            option.textContent = coin.name;
            this.fromSelect.appendChild(option.cloneNode(true));
            this.toSelect.appendChild(option);
        });
    }

    async convert() {
        const amount = parseFloat(this.amountInput.value);
        const fromCurrency = this.fromSelect.value;
        const toCurrency = this.toSelect.value;

        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${fromCurrency},${toCurrency}&vs_currencies=usd`);
        const data = await response.json();

        const fromPrice = data[fromCurrency].usd;
        const toPrice = data[toCurrency].usd;

        const result = (amount * fromPrice) / toPrice;
        this.resultDiv.textContent = `${amount} ${fromCurrency} = ${result.toFixed(8)} ${toCurrency}`;
    }
}

const calculator = new CryptoCalculator(
    document.getElementById('from-currency'),
    document.getElementById('to-currency'),
    document.getElementById('amount-input'),
    document.getElementById('result')
);

// Push Notifications for Price Alerts
class NotificationManager {
    constructor() {
        this.sw = null;
    }

    async init() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            this.sw = await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered');
        }
    }

    async requestPermission() {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Permission not granted for Notification');
        }
    }

    async subscribeToPush() {
        const subscription = await this.sw.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY'
        });
        // Send the subscription to your server
        await fetch('/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async setPriceAlert(coin, targetPrice) {
        // Send the alert details to your server
        await fetch('/set-alert', {
            method: 'POST',
            body: JSON.stringify({ coin, targetPrice }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

const notificationManager = new NotificationManager();

// Live Chat Widget
const chatWidget = document.getElementById('chat-widget');
const openChatButton = document.getElementById('open-chat');
const closeChatButton = document.getElementById('close-chat');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

openChatButton.addEventListener('click', () => {
    chatWidget.style.display = 'flex';
    openChatButton.style.display = 'none';
});

closeChatButton.addEventListener('click', () => {
    chatWidget.style.display = 'none';
    openChatButton.style.display = 'block';
});

function addChatMessage(message, isUser = false) {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${isUser ? 'You' : 'Agent'}: ${message}`;
    messageElement.classList.add(isUser ? 'user-message' : 'agent-message');
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        addChatMessage(message, true);
        chatInput.value = '';
        // Simulate a response (replace with actual chat functionality)
        setTimeout(() => {
            addChatMessage('Thank you for your message. How can I assist you with cryptocurrency investments today?');
        }, 1000);
    }
}

// Search functionality
const searchInput = document.querySelector('#search-bar input');
const searchButton = document.querySelector('#search-bar button');

function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const cryptoCards = document.querySelectorAll('.crypto-card');
    cryptoCards.forEach(card => {
        const coinName = card.querySelector('h3').textContent.toLowerCase();
        if (coinName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Sidebar toggle functionality
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');

function toggleSidebar() {
    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        sidebar.style.left = '0';
    } else {
        sidebar.style.left = '-240px';
    }
}

sidebarToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleSidebar();
});

// Close sidebar when clicking outside of it
document.addEventListener('click', (event) => {
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isClickOnToggle = sidebarToggle.contains(event.target);
    
    if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
        toggleSidebar();
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await displayCryptoData();
    updateChart();
    newsManager.fetchNews();
    calculator.populateCurrencies();
    notificationManager.init();
    
    document.getElementById('enable-notifications').addEventListener('click', async () => {
        await notificationManager.requestPermission();
        await notificationManager.subscribeToPush();
    });

    document.getElementById('set-alert').addEventListener('click', () => {
        const coin = document.getElementById('alert-coin').value;
        const price = document.getElementById('alert-price').value;
        notificationManager.setPriceAlert(coin, price);
    });

    document.getElementById('send-chat').addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    document.getElementById('calculate-btn').addEventListener('click', () => calculator.convert());

    document.getElementById('news-search').addEventListener('input', (e) => {
        newsManager.filterNews(e.target.value);
    });

    document.getElementById('news-category').addEventListener('change', (e) => {
        newsManager.fetchNews(e.target.value);
    });

    // Check window width and toggle sidebar accordingly
    function checkWindowSize() {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebar.style.left = '-240px';
        } else {
            sidebar.classList.add('active');
            sidebar.style.left = '0';
        }
    }

    // Initial check
    checkWindowSize();

    // Listen for window resize events
    window.addEventListener('resize', () => {
        checkWindowSize();
        chart.applyOptions({
            width: chartContainer.offsetWidth,
            height: window.innerWidth > 768 ? 300 : 200,
        });
    });
});

// Initial chat message
addChatMessage('Welcome to CryptoInvest Pro! How can I help you today?');