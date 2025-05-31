import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButton, 
  IonIcon, 
  IonInput, 
  IonLabel, 
  IonItem, 
  IonRadio, 
  IonRadioGroup, 
  IonSelect, 
  IonSelectOption, 
  IonDatetime,
  ActionSheetController, 
  ToastController 
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  flaskOutline, 
  timeOutline, 
  personOutline,
  cameraOutline,
  calendarOutline,
  imagesOutline,
  close
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
  imports: [
    CommonModule, 
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonLabel,
    IonItem,
    IonRadio,
    IonRadioGroup,
  
  ]
})
export class ProfilePage implements OnInit {
  maxDate: string;
  emailError: string = '';
  phoneError: string = '';
  emergencyPhoneError: string = '';
  
  profileData: ProfileData = {
    fullname: 'Juan Dela Cruz',
    dateOfBirth: '1992-08-08',
    gender: 'male',
    email: 'juan.delacruz@email.com',
    phoneNumber: '9123456789',
    emergencyContact: 'Maria Dela Cruz',
    emergencyContactNumber: '9987654321',
    profileImage: '', // Empty by default to show icon
    location: 'Quezon City, Philippines'
  };

  constructor(
    private router: Router,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController
  ) {
    addIcons({ 
      homeOutline, 
      flaskOutline, 
      timeOutline, 
      personOutline,
      cameraOutline,
      calendarOutline,
      imagesOutline,
      close
    });

    // Set max date to today for date of birth
    this.maxDate = new Date().toISOString().split('T')[0];
  }

  async ngOnInit() {
    await this.loadProfile();
    console.log('Profile page loaded, testing editability...');
  }

  async loadProfile() {
    try {
      console.log('Profile data loaded:', this.profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  // Email validation
  validateEmail() {
    const email = this.profileData.email.trim();
    if (!email) {
      this.emailError = 'Email is required';
      return false;
    }
    
    // Check for @ and .com
    if (!email.includes('@') || !email.includes('.com')) {
      this.emailError = 'Email must contain @ and .com';
      return false;
    }
    
    // More thorough email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
    if (!emailRegex.test(email)) {
      this.emailError = 'Please enter a valid email address ending with .com';
      return false;
    }
    
    this.emailError = '';
    return true;
  }

  // Phone number validation - only numbers, exactly 10 digits
  validatePhoneNumber(type: 'phone' | 'emergency') {
    const phoneNumber = type === 'phone' ? this.profileData.phoneNumber : this.profileData.emergencyContactNumber;
    
    // Remove non-numeric characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Update the model with clean number
    if (type === 'phone') {
      this.profileData.phoneNumber = cleanNumber;
    } else {
      this.profileData.emergencyContactNumber = cleanNumber;
    }
    
    // Validate length
    if (cleanNumber.length > 0 && cleanNumber.length !== 10) {
      const errorMessage = 'Phone number must be exactly 10 digits';
      if (type === 'phone') {
        this.phoneError = errorMessage;
      } else {
        this.emergencyPhoneError = errorMessage;
      }
      return false;
    }
    
    // Clear error if valid
    if (type === 'phone') {
      this.phoneError = '';
    } else {
      this.emergencyPhoneError = '';
    }
    return true;
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
      // Reset all errors
      this.emailError = '';
      this.phoneError = '';
      this.emergencyPhoneError = '';

      // Validate full name
      if (!this.profileData.fullname || !this.profileData.fullname.trim()) {
        await this.showToast('Please enter your full name.');
        return;
      }

      // Validate email
      if (!this.validateEmail()) {
        await this.showToast('Please enter a valid email address.');
        return;
      }

      // Validate phone numbers
      if (!this.validatePhoneNumber('phone')) {
        await this.showToast('Please enter a valid 10-digit phone number.');
        return;
      }

      if (!this.validatePhoneNumber('emergency')) {
        await this.showToast('Please enter a valid 10-digit emergency contact number.');
        return;
      }

      // Check if phone numbers are exactly 10 digits
      if (this.profileData.phoneNumber.length !== 10) {
        this.phoneError = 'Phone number must be exactly 10 digits';
        await this.showToast('Phone number must be exactly 10 digits.');
        return;
      }

      if (this.profileData.emergencyContactNumber.length !== 10) {
        this.emergencyPhoneError = 'Emergency contact number must be exactly 10 digits';
        await this.showToast('Emergency contact number must be exactly 10 digits.');
        return;
      }

      console.log('Profile would be saved:', {
        ...this.profileData,
        phoneNumber: '+63' + this.profileData.phoneNumber,
        emergencyContactNumber: '+63' + this.profileData.emergencyContactNumber
      });
      
      await this.showToast('Profile saved successfully!');
      
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

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }

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
  }

  navigateToProfile() {
    console.log('Already on Profile page');
  }

  testInput() {
    console.log('Input test triggered, current name:', this.profileData.fullname);
  }
}