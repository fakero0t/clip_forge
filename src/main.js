console.log('🚀 main.js: Starting Vue app initialization...');

import { createApp } from 'vue';
console.log('✅ main.js: Vue imported successfully');

import { createPinia } from 'pinia';
console.log('✅ main.js: Pinia imported successfully');

import App from './App.vue';
console.log('✅ main.js: App component imported successfully');

import './styles/main.css';
console.log('✅ main.js: Styles imported successfully');

console.log('🔧 main.js: Creating Vue app...');
const app = createApp(App);
console.log('✅ main.js: Vue app created');

console.log('🔧 main.js: Creating Pinia store...');
const pinia = createPinia();
console.log('✅ main.js: Pinia store created');

console.log('🔧 main.js: Installing Pinia...');
app.use(pinia);
console.log('✅ main.js: Pinia installed');

console.log('🔧 main.js: Mounting app to #app...');
app.mount('#app');
console.log('✅ main.js: App mounted successfully!');
