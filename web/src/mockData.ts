export const ACCOUNTS = [
  { id:'1', name:'Cuenta Corriente', institution:'Bancolombia', type:'checking', balance: 4850000, color:'#3B82F6' },
  { id:'2', name:'Ahorros', institution:'Davivienda', type:'savings', balance: 12300000, color:'#22C55E' },
  { id:'3', name:'Tarjeta Crédito', institution:'Visa', type:'credit', balance: -1200000, color:'#EF4444' },
];

export const TRANSACTIONS = [
  { id:'1', desc:'Nómina Mayo', category:'Salario', type:'income', amount:5800000, date:'2026-06-01', icon:'💼', color:'#22C55E' },
  { id:'2', desc:'Supermercado Éxito', category:'Alimentación', type:'expense', amount:320000, date:'2026-05-31', icon:'🛒', color:'#3B82F6' },
  { id:'3', desc:'Uber', category:'Transporte', type:'expense', amount:45000, date:'2026-05-31', icon:'🚗', color:'#F59E0B' },
  { id:'4', desc:'Netflix', category:'Entretenimiento', type:'expense', amount:49900, date:'2026-05-30', icon:'🎬', color:'#8B5CF6' },
  { id:'5', desc:'Farmacia Cruz Verde', category:'Salud', type:'expense', amount:85000, date:'2026-05-30', icon:'💊', color:'#EC4899' },
  { id:'6', desc:'Freelance diseño', category:'Freelance', type:'income', amount:800000, date:'2026-05-29', icon:'💻', color:'#22C55E' },
  { id:'7', desc:'Arriendo', category:'Vivienda', type:'expense', amount:1200000, date:'2026-05-28', icon:'🏠', color:'#F97316' },
  { id:'8', desc:'Gimnasio', category:'Deporte', type:'expense', amount:89000, date:'2026-05-28', icon:'🏋️', color:'#06B6D4' },
];

export const GOALS = [
  { id:'1', name:'Fondo de emergencia', type:'emergency_fund', target:10000000, saved:6500000, monthly:500000, color:'#22C55E', icon:'🛡️', date:'2026-12-31' },
  { id:'2', name:'Vacaciones Cartagena', type:'travel', target:3500000, saved:1200000, monthly:300000, color:'#3B82F6', icon:'✈️', date:'2026-08-15' },
  { id:'3', name:'MacBook Pro', type:'purchase', target:8000000, saved:2400000, monthly:400000, color:'#8B5CF6', icon:'💻', date:'2027-03-01' },
];

export const SPENDING = [
  { name:'Vivienda', amount:1200000, pct:38, color:'#22C55E' },
  { name:'Alimentación', amount:640000, pct:20, color:'#3B82F6' },
  { name:'Transporte', amount:320000, pct:10, color:'#F59E0B' },
  { name:'Entretenimiento', amount:250000, pct:8, color:'#8B5CF6' },
  { name:'Salud', amount:185000, pct:6, color:'#EC4899' },
  { name:'Otros', amount:560000, pct:18, color:'#64748B' },
];
