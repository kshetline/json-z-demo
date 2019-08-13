import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule} from 'primeng/inputtextarea';
import { MenuModule } from 'primeng/menu';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SharedModule } from 'primeng/shared';
import { TooltipModule } from 'primeng/tooltip';

import { AppComponent } from './app.component';
import { EscapeHtmlPipe } from './keep-html.pipe';
import { PreferencesService } from './preferences.service';

@NgModule({
  declarations: [
    AppComponent,
    EscapeHtmlPipe,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    ButtonModule,
    CheckboxModule,
    DropdownModule,
    FieldsetModule,
    FormsModule,
    HttpClientModule,
    InputTextareaModule,
    InputTextModule,
    MenuModule,
    RadioButtonModule,
    SharedModule,
    TooltipModule,
  ],
  providers: [PreferencesService],
  bootstrap: [AppComponent]
})
export class AppModule { }
