import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ActionSheetController, ToastController } from '@ionic/angular';

// Add these icon imports
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  flaskOutline, 
  timeOutline, 
  personOutline,
  cameraOutline,
  calendarOutline
} from 'ionicons/icons';

interface ProfileData {
  fullname: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phoneNumber: string;
  emergencyContact: string;
  emergencyContactNumber: string;
  profileImage: string;
  location: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ProfilePage implements OnInit {
  maxDate: string;
  minDate: string;
  
  profileData: ProfileData = {
    fullname: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phoneNumber: '',
    emergencyContact: '',
    emergencyContactNumber: '',
    profileImage: 'assets/images/default-profile.jpg',
    location: 'Quezon City, Philippines'
  };

  constructor(
    private router: Router,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController
  ) {
    // Register icons
    addIcons({ 
      homeOutline, 
      flaskOutline, 
      timeOutline, 
      personOutline,
      cameraOutline,
      calendarOutline
    });

    // Set date range: January 1, 1980 to May 1, 2025
    this.minDate = '1980-01-01';
    this.maxDate = '2025-05-01';
  }

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    try {
      // Load profile data from storage or API
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        this.profileData = { ...this.profileData, ...parsedProfile };
        
        // Update location in header if fullname is available
        if (this.profileData.fullname.trim()) {
          // Keep the default location or use saved location
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async changeProfileImage() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Select Image Source',
      buttons: [
        {
          text: 'Camera',
          icon: 'camera-outline',
          handler: () => {
            this.takePicture(CameraSource.Camera);
          }
        },
        {
          text: 'Photo Library',
          icon: 'images-outline',
          handler: () => {
            this.takePicture(CameraSource.Photos);
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image.dataUrl) {
        this.profileData.profileImage = image.dataUrl;
        await this.showToast('Profile image updated successfully!');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      await this.showToast('Error updating profile image. Please try again.');
    }
  }

  async saveProfile() {
    try {
      // Validate required fields
      if (!this.profileData.fullname.trim()) {
        await this.showToast('Please enter your full name.');
        return;
      }

      if (!this.profileData.email.trim()) {
        await this.showToast('Please enter your email address.');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.profileData.email)) {
        await this.showToast('Please enter a valid email address.');
        return;
      }

      if (!this.profileData.phoneNumber.trim()) {
        await this.showToast('Please enter your phone number.');
        return;
      }

      if (!this.profileData.dateOfBirth) {
        await this.showToast('Please select your date of birth.');
        return;
      }

      if (!this.profileData.gender) {
        await this.showToast('Please select your gender.');
        return;
      }

      if (!this.profileData.emergencyContact.trim()) {
        await this.showToast('Please enter an emergency contact name.');
        return;
      }

      if (!this.profileData.emergencyContactNumber.trim()) {
        await this.showToast('Please enter an emergency contact number.');
        return;
      }

      // Save to local storage (replace with API call in production)
      localStorage.setItem('userProfile', JSON.stringify(this.profileData));
      
      await this.showToast('Profile saved successfully!');
      
      console.log('Profile saved:', this.profileData);
    } catch (error) {
      console.error('Error saving profile:', error);
      await this.showToast('Error saving profile. Please try again.');
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  // Bottom Navigation Methods
  navigateToHome() {
    console.log('Navigating to home from profile...');
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    console.log('Navigating to chemicals from profile...');
    this.router.navigate(['/chemical-list']);
  }

  navigateToHistory() {
    console.log('History feature coming soon');
    // TODO: Implement history navigation when ready
  }

  navigateToProfile() {
    console.log('Already on Profile page');
    // Already on profile page - do nothing
  }
}