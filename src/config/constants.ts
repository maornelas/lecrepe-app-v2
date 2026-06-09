// Versión de la app (usada en Configuración > Acerca de)
export const APP_VERSION = '1.5.4';
export const APP_CHANGELOG = 'Nuvo modal de frutas para la crepa Chocolatosa';

// Solo crepas saladas: $5 por ingrediente adicional, $10 si el ingrediente es champiñones
export const SALTY_CREPE_EXTRA_INGREDIENT_PRICE = 5; // $ por cada ingrediente adicional (solo crepas saladas)
export const SALTY_CREPE_MUSHROOM_PRICE = 10; // $ si agregan champiñones (solo crepas saladas)

// Backend constants
export const backend = {
  product: {
    crepe: 'crepa',
    drink: 'bebida',
    icecream: 'helado',
    hot: 'caliente',
    cold: 'frio',
    sweet: 'dulce',
    salty: 'salada',
  },
  payment: {
    status: {
      paid: 'paid',
    },
  },
  rol: {
    admin: 'administrador',
    chef: 'cocinero',
    waitress: 'mesero',
  },
  order: {
    status: {
      finished: 'Finalizada',
      preparing: 'Preparando',
      ordered: 'Ordenada',
      ready: 'Lista',
    },
  },
};





