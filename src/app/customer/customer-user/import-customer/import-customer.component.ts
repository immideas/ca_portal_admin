import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router'; 
import { ToastrService } from 'ngx-toastr';
import { CustomerService } from '../../../services/customer-group.service';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-import-customer',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './import-customer.component.html',
  styleUrl: './import-customer.component.css'
})
export class ImportCustomerComponent implements OnInit { 
  selectedFile: File | null = null;
  fileName: string = '';
  isUploading = false;
  importResult: any = null;
  projectId: string | null = null; 

  constructor(
    private service: CustomerService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute 
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['projectId']) {
        this.projectId = params['projectId'];
      }
    });
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx'].includes(ext || '')) {
      this.toastr.error('Only .xls or .xlsx files are allowed');
      return;
    }
    this.selectedFile = file;
    this.fileName = file.name;
    this.importResult = null;
  }

  upload() {
    if (!this.selectedFile) {
      this.toastr.error('Please select an Excel file first');
      return;
    }

    if (!this.projectId) {
      this.toastr.error('No project selected. Please go back and select a project first.');
      return;
    }

    this.isUploading = true;

    this.service.importCustomers(this.selectedFile, this.projectId).subscribe({ 
      next: () => {
        this.isUploading = false;
        this.toastr.success('Customers imported successfully');
        this.router.navigate(['/manage-customer'], {
          queryParams: { projectId: this.projectId } 
        });
      },
      error: () => {
        this.isUploading = false;
        this.toastr.error('Failed to import customers');
        this.router.navigate(['/manage-customer'], {
          queryParams: { projectId: this.projectId }
        });
      }
    });
  }

  cancel() {
    this.router.navigate(['/manage-customer'], {
      queryParams: this.projectId ? { projectId: this.projectId } : {}
    });
  }
}