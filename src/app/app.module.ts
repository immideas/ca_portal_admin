import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgxPaginationModule } from 'ngx-pagination';
import { ToastrModule } from 'ngx-toastr'; 
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { NgxEditorModule } from 'ngx-editor'; 
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClientModule } from '@angular/common/http';
import { ImageUploaderLibComponent } from "@swiftlyme/image-uploader";
import { EditorModule } from '@swiftlyme/editor';
import { ColorMethodSelectorComponent } from '@swiftlyme/color-spotter';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, 
    MatFormFieldModule,
    MatSelectModule,
    NgxPaginationModule,
    ToastrModule.forRoot(), 
    MatDialogModule,
    FormsModule,
    NgxEditorModule, 
    MatTooltipModule,
    HttpClientModule,
    ImageUploaderLibComponent,
    EditorModule,
ColorMethodSelectorComponent

  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class AppModule { 
  onColor(hex: string) {
    console.log(hex); // e.g. "#3A7BD5"
  }
}
