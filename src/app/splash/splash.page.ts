import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';
import { IonContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [IonContent]
})
export class SplashPage implements OnInit {

  constructor(
    private router: Router,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      SplashScreen.hide();
    });

    setTimeout(() => {
      this.router.navigate(['/emergency-types'], { replaceUrl: true });
    }, 1500);
  }
}