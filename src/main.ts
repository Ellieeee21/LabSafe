import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { DatabaseService } from './app/services/database.service';

// SQLite imports
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

// Initialize SQLite
const initSQLite = async (): Promise<boolean> => {
  if (Capacitor.getPlatform() === 'web') {
    // Initialize jeep-sqlite web component
    jeepSqlite(window);
    
    // Create the 'jeep-sqlite' Stencil component
    const jeepSqliteEl = document.createElement('jeep-sqlite');
    document.body.appendChild(jeepSqliteEl);
    
    // Wait for the component to be ready
    await customElements.whenDefined('jeep-sqlite');
    
    // Initialize the Web store
    await CapacitorSQLite.initWebStore();
  }
  
  const sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  
  try {
    if (Capacitor.getPlatform() === 'web') {
      // Save the database from store to disk
      await sqlite.saveToStore('labsafe_chemicals');
    }
  } catch (error) {
    console.log('SQLite initialization error:', error);
  }
  
  return true;
};

if (environment.production) {
  enableProdMode();
}

// Initialize SQLite then bootstrap the app
initSQLite().then(() => {
  bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideIonicAngular(),
      provideRouter(routes, withPreloading(PreloadAllModules)),
      provideHttpClient(),
      DatabaseService,
    ],
  }).catch(err => console.log(err));
}).catch(err => {
  console.error('Failed to initialize SQLite:', err);
  // Bootstrap anyway with limited functionality
  bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideIonicAngular(),
      provideRouter(routes, withPreloading(PreloadAllModules)),
      provideHttpClient(),
      DatabaseService,
    ],
  }).catch(err => console.log(err));
});