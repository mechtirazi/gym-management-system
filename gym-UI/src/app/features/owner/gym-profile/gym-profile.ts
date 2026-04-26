import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { GymProfileService } from './services/gym-profile.service';
import { Gym } from '../../../shared/models/gym.model';
import { GymProfileHeaderComponent } from './components/header/gym-profile-header.component';
import { GymProfileFormComponent } from './components/form/gym-profile-form.component';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';

import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-gym-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GymProfileHeaderComponent,
    GymProfileFormComponent,
    MatIconModule
  ],
  templateUrl: './gym-profile.html',
  styleUrl: './gym-profile.scss',
})
export class GymProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private gymService = inject(GymProfileService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);


  isEditing = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  loadError = signal<string | null>(null);
  
  gymStatus = signal<string | null>(null);
  suspensionReason = signal<string | null>(null);

  currentGymId = signal<string | number | null>(null);
  myGyms = signal<any[]>([]);
  initialFormValues: any = null;
  initialLogo: string | null = null;
  currentLogo = signal<string | null>(null);
  selectedFile: File | null = null;

  connectedGymId = this.authService.connectedGymId;

  gymForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9+\\- ]{8,15}$')]],
    address: ['', Validators.required],
    description: [''],
    open_mon_fri: [''],
    open_sat: [''],
    open_sun: [''],
  });

  ngOnInit() {
    this.fetchOwnerGym();
  }

  fetchOwnerGym() {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.gymService.getAllGyms()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          // Structure based on backend: { success, data: Array(X), message }
          const activeId = this.authService.connectedGymId();
          let myGym = null;

          if (Array.isArray(response.data)) {
            this.myGyms.set(response.data);
            myGym = activeId ? response.data.find((g: Gym) => g.id_gym === activeId || g.id_gym === String(activeId)) : response.data[0];
            if (!myGym && response.data.length > 0) myGym = response.data[0];
          } else {
            myGym = response.data;
            if (myGym) this.myGyms.set([myGym]);
          }

          if (myGym) {
            // Backend uses id_gym as the primary key
            const gymId = myGym.id_gym || myGym.id || null;
            this.currentGymId.set(gymId);
            this.gymStatus.set(myGym.status || null);
            this.suspensionReason.set(myGym.suspension_reason || null);
            const rawLogo = myGym.picture || myGym.logo || myGym.logo_url || myGym.image || null;
            const loadedLogo = this.getImageUrl(rawLogo);
            this.initialLogo = loadedLogo;
            this.currentLogo.set(loadedLogo);

            const fetchedData = {
              name: myGym.name || '',
              // Contact email is often in owner object if not in root
              email: myGym.email || myGym.owner?.email || '',
              phone: myGym.phone || '',
              // Backend has a typo (adress with one 'd')
              address: myGym.adress || myGym.address || '',
              description: myGym.description || '',
              open_mon_fri: myGym.open_mon_fri || '',
              open_sat: myGym.open_sat || '',
              open_sun: myGym.open_sun || ''
            };

            this.initialFormValues = { ...fetchedData };
            this.gymForm.patchValue(fetchedData);
          } else {
            this.loadError.set('No gym profile found assigned to your account.');
          }
        },
        error: (err) => {
          console.error('Fetch Error:', err);
          this.loadError.set('Unable to load gym profile.');
        }
      });
  }

  toggleEdit() {
    if (this.isEditing() && this.initialFormValues) {
      // We are discarding changes, revert form to initial values
      this.gymForm.patchValue(this.initialFormValues);
      this.selectedFile = null;
      this.currentLogo.set(this.initialLogo);
    }
    this.isEditing.update(v => !v);
  }

  handleCoverPhoto(file: File) {
    this.selectedFile = file;
    // Create a local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentLogo.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  saveProfile() {
    const targetId = this.currentGymId();
    if (this.gymForm.invalid || !targetId) return;

    this.isSaving.set(true);
    const rawValue = this.gymForm.getRawValue();

    // Map the form data back to the server's expected keys (e.g., adress)
    const payload = { ...rawValue } as any;
    payload.adress = payload.address;
    delete payload.address;

    let finalPayload: any = payload;

    // Use FormData if a file was selected
    if (this.selectedFile) {
      finalPayload = new FormData();
      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
          finalPayload.append(key, payload[key]);
        }
      });
      // Append the file (common parameter names: file, image, logo, cover)
      finalPayload.append('logo', this.selectedFile);
    }

    this.gymService.updateGym(targetId, finalPayload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          this.initialFormValues = { ...rawValue };
          this.initialLogo = this.currentLogo();
          this.selectedFile = null;
          this.isEditing.set(false);
          this.toast.success('Gym profile updated successfully!');
        },
        error: (err) => {
          console.error('Failed to update gym:', err);
          const errorMsg = err.error?.message || 'Failed to save changes. Please check your connection.';
          this.toast.error(errorMsg);
        }
      });
  }

  switchGym(gym: any): void {
    this.isLoading.set(true);
    this.authService.switchGym(gym.id_gym, gym.status, gym.suspension_reason);
  }

  getImageUrl(path?: string): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;

    // Ensure baseUrl doesn't end with slash and cleanPath doesn't start with slash
    const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');

    const finalUrl = `${baseUrl}/${cleanPath}`;
    console.log('Resolving Image URL:', finalUrl);
    return finalUrl;
  }
}
