import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent implements OnInit {
  private platform = inject(Platform);

  ngOnInit() {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    
    // Configure status bar
    if (this.platform.is('capacitor')) {
      await StatusBar.setStyle({ style: Style.Default });
    }
  }
}