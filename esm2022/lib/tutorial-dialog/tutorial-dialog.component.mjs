import { Component, EventEmitter, Inject, Input, Output, PLATFORM_ID, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { BdcDisplayEventAction } from '../bdc-walk.service';
import { isPlatformServer } from "@angular/common";
import * as i0 from "@angular/core";
import * as i1 from "@angular/material/dialog";
import * as i2 from "../bdc-walk.service";
export class BdcWalkDialogComponent {
    constructor(dialog, tutorialService, platformID) {
        this.dialog = dialog;
        this.tutorialService = tutorialService;
        this.platformID = platformID;
        this.mustCompleted = {};
        this.mustNotDisplaying = [];
        this.width = '500px';
        this.opened = new EventEmitter();
        this.closed = new EventEmitter();
    }
    ngOnInit() {
        if (isPlatformServer(this.platformID)) {
            return;
        }
    }
    ngAfterContentInit() {
        this.componentSubscription = this.tutorialService.changes.subscribe(() => this._sync());
    }
    ngOnChanges() {
        this._sync();
    }
    ngOnDestroy() {
        if (this.componentSubscription) {
            this.componentSubscription.unsubscribe();
        }
        this._close();
    }
    getValue(taskName) {
        return this.tutorialService.getTaskCompleted(taskName);
    }
    close(setTasks = {}) {
        this.tutorialService.logUserAction(this.name, BdcDisplayEventAction.UserClosed);
        this.tutorialService.setTaskCompleted(this.name);
        this.tutorialService.setTasks(setTasks);
    }
    _open() {
        this.dialogRef = this.dialog.open(this.templateRef, { width: this.width, disableClose: true, restoreFocus: false, panelClass: 'bdc-walk-dialog' });
        this.opened.emit();
    }
    _close() {
        if (this.dialogRef) {
            this.dialogRef.close();
            this.dialogRef = null;
            this.closed.emit();
        }
    }
    _sync() {
        if (this.name) {
            if (!this.tutorialService.getTaskCompleted(this.name) &&
                !this.tutorialService.disabled &&
                this.tutorialService.evalMustCompleted(this.mustCompleted) &&
                this.tutorialService.evalMustNotDisplaying(this.mustNotDisplaying)) {
                if (!this.dialogRef) {
                    this._open();
                    this.tutorialService.setIsDisplaying(this.name, true);
                }
            }
            else if (this.dialogRef) {
                this._close();
                this.tutorialService.setIsDisplaying(this.name, false);
            }
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.8", ngImport: i0, type: BdcWalkDialogComponent, deps: [{ token: i1.MatDialog }, { token: i2.BdcWalkService }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.0.8", type: BdcWalkDialogComponent, selector: "bdc-walk-dialog", inputs: { name: "name", mustCompleted: "mustCompleted", mustNotDisplaying: "mustNotDisplaying", width: "width" }, outputs: { opened: "opened", closed: "closed" }, viewQueries: [{ propertyName: "templateRef", first: true, predicate: TemplateRef, descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: "<ng-template>\n  <div class=\"container\">\n    <ng-content></ng-content>\n  </div>\n</ng-template>\n", styles: [""], encapsulation: i0.ViewEncapsulation.None }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.8", ngImport: i0, type: BdcWalkDialogComponent, decorators: [{
            type: Component,
            args: [{ selector: 'bdc-walk-dialog', encapsulation: ViewEncapsulation.None, template: "<ng-template>\n  <div class=\"container\">\n    <ng-content></ng-content>\n  </div>\n</ng-template>\n" }]
        }], ctorParameters: () => [{ type: i1.MatDialog }, { type: i2.BdcWalkService }, { type: Object, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }], propDecorators: { name: [{
                type: Input
            }], mustCompleted: [{
                type: Input
            }], mustNotDisplaying: [{
                type: Input
            }], width: [{
                type: Input
            }], opened: [{
                type: Output
            }], closed: [{
                type: Output
            }], templateRef: [{
                type: ViewChild,
                args: [TemplateRef, { static: true }]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHV0b3JpYWwtZGlhbG9nLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Byb2plY3RzL2JkYy13YWxrdGhyb3VnaC9zcmMvbGliL3R1dG9yaWFsLWRpYWxvZy90dXRvcmlhbC1kaWFsb2cuY29tcG9uZW50LnRzIiwiLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvYmRjLXdhbGt0aHJvdWdoL3NyYy9saWIvdHV0b3JpYWwtZGlhbG9nL3R1dG9yaWFsLWRpYWxvZy5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBRUwsU0FBUyxFQUNULFlBQVksRUFBRSxNQUFNLEVBQ3BCLEtBQUssRUFHTCxNQUFNLEVBQUUsV0FBVyxFQUNuQixXQUFXLEVBQ1gsU0FBUyxFQUFFLGlCQUFpQixFQUM3QixNQUFNLGVBQWUsQ0FBQztBQUd2QixPQUFPLEVBQUMscUJBQXFCLEVBQWlCLE1BQU0scUJBQXFCLENBQUM7QUFDMUUsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7Ozs7QUFRakQsTUFBTSxPQUFPLHNCQUFzQjtJQVlqQyxZQUFvQixNQUFpQixFQUNqQixlQUErQixFQUNWLFVBQWtCO1FBRnZDLFdBQU0sR0FBTixNQUFNLENBQVc7UUFDakIsb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBQ1YsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQVpsRCxrQkFBYSxHQUEwQyxFQUFFLENBQUM7UUFDMUQsc0JBQWlCLEdBQWEsRUFBRSxDQUFDO1FBQ2pDLFVBQUssR0FBRyxPQUFPLENBQUM7UUFDZixXQUFNLEdBQUcsSUFBSSxZQUFZLEVBQVEsQ0FBQztRQUNsQyxXQUFNLEdBQUcsSUFBSSxZQUFZLEVBQVEsQ0FBQztJQVM1QixDQUFDO0lBRWpCLFFBQVE7UUFDTixJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNyQyxPQUFPO1NBQ1I7SUFDSCxD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SUFBSTtzQkFBWixLQUFLO2dCQUNHLGFBQWE7c0JBQXJCLEtBQUs7Z0JBQ0csaUJBQWlCO3NCQUF6QixLQUFLO2dCQUNHLEtBQUs7c0JBQWIsS0FBSztnQkFDSSxNQUFNO3NCQUFmLE1BQU07Z0JBQ0csTUFBTTtzQkFBZixNQUFNO2dCQUNpQyxXQUFXO3NCQUFsRCxTQUFTO3VCQUFDLFdBQVcsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBBZnRlckNvbnRlbnRJbml0LFxuICBDb21wb25lbnQsXG4gIEV2ZW50RW1pdHRlciwgSW5qZWN0LFxuICBJbnB1dCxcbiAgT25DaGFuZ2VzLFxuICBPbkRlc3Ryb3ksIE9uSW5pdCxcbiAgT3V0cHV0LCBQTEFURk9STV9JRCxcbiAgVGVtcGxhdGVSZWYsXG4gIFZpZXdDaGlsZCwgVmlld0VuY2Fwc3VsYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge01hdERpYWxvZywgTWF0RGlhbG9nUmVmfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9kaWFsb2cnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtCZGNEaXNwbGF5RXZlbnRBY3Rpb24sIEJkY1dhbGtTZXJ2aWNlfSBmcm9tICcuLi9iZGMtd2Fsay5zZXJ2aWNlJztcbmltcG9ydCB7aXNQbGF0Zm9ybVNlcnZlcn0gZnJvbSBcIkBhbmd1bGFyL2NvbW1vblwiO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdiZGMtd2Fsay1kaWFsb2cnLFxuICB0ZW1wbGF0ZVVybDogJy4vdHV0b3JpYWwtZGlhbG9nLmNvbXBvbmVudC5odG1sJyxcbiAgc3R5bGVVcmxzOiBbJy4vdHV0b3JpYWwtZGlhbG9nLmNvbXBvbmVudC5zY3NzJ10sXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmVcbn0pXG5leHBvcnQgY2xhc3MgQmRjV2Fsa0RpYWxvZ0NvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgQWZ0ZXJDb250ZW50SW5pdCwgT25EZXN0cm95LCBPbkNoYW5nZXMge1xuICBASW5wdXQoKSBuYW1lOiBzdHJpbmc7XG4gIEBJbnB1dCgpIG11c3RDb21wbGV0ZWQ6IHsgW3Rhc2tOYW1lOiBzdHJpbmddOiBhbnkgfCBib29sZWFuIH0gPSB7fTtcbiAgQElucHV0KCkgbXVzdE5vdERpc3BsYXlpbmc6IHN0cmluZ1tdID0gW107XG4gIEBJbnB1dCgpIHdpZHRoID0gJzUwMHB4JztcbiAgQE91dHB1dCgpIG9wZW5lZCA9IG5ldyBFdmVudEVtaXR0ZXI8dm9pZD4oKTtcbiAgQE91dHB1dCgpIGNsb3NlZCA9IG5ldyBFdmVudEVtaXR0ZXI8dm9pZD4oKTtcbiAgQFZpZXdDaGlsZChUZW1wbGF0ZVJlZiwge3N0YXRpYzogdHJ1ZX0pIHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxhbnk+O1xuXG4gIGRpYWxvZ1JlZjogTWF0RGlhbG9nUmVmPGFueT47XG4gIGNvbXBvbmVudFN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGlhbG9nOiBNYXREaWFsb2csXG4gICAgICAgICAgICAgIHByaXZhdGUgdHV0b3JpYWxTZXJ2aWNlOiBCZGNXYWxrU2VydmljZSxcbiAgICAgICAgICAgICAgQEluamVjdChQTEFURk9STV9JRCkgcHJpdmF0ZSBwbGF0Zm9ybUlEOiBPYmplY3RcbiAgICAgICAgICAgICAgKSB7IH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICBpZiAoaXNQbGF0Zm9ybVNlcnZlcih0aGlzLnBsYXRmb3JtSUQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgbmdBZnRlckNvbnRlbnRJbml0KCkge1xuICAgIHRoaXMuY29tcG9uZW50U3Vic2NyaXB0aW9uID0gdGhpcy50dXRvcmlhbFNlcnZpY2UuY2hhbmdlcy5zdWJzY3JpYmUoKCkgPT4gdGhpcy5fc3luYygpKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKCk6IHZvaWQge1xuICAgIHRoaXMuX3N5bmMoKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLmNvbXBvbmVudFN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5jb21wb25lbnRTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jbG9zZSgpO1xuICB9XG5cbiAgZ2V0VmFsdWUodGFza05hbWU6IHN0cmluZyk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMudHV0b3JpYWxTZXJ2aWNlLmdldFRhc2tDb21wbGV0ZWQodGFza05hbWUpO1xuICB9XG5cbiAgY2xvc2Uoc2V0VGFza3M6IHsgW3Rhc2tOYW1lOiBzdHJpbmddOiBhbnkgfCBib29sZWFuIH0gPSB7fSkge1xuICAgIHRoaXMudHV0b3JpYWxTZXJ2aWNlLmxvZ1VzZXJBY3Rpb24odGhpcy5uYW1lLCBCZGNEaXNwbGF5RXZlbnRBY3Rpb24uVXNlckNsb3NlZCk7XG4gICAgdGhpcy50dXRvcmlhbFNlcnZpY2Uuc2V0VGFza0NvbXBsZXRlZCh0aGlzLm5hbWUpO1xuICAgIHRoaXMudHV0b3JpYWxTZXJ2aWNlLnNldFRhc2tzKHNldFRhc2tzKTtcbiAgfVxuXG4gIHByaXZhdGUgX29wZW4oKSB7XG4gICAgdGhpcy5kaWFsb2dSZWYgPSB0aGlzLmRpYWxvZy5vcGVuKHRoaXMudGVtcGxhdGVSZWYsIHt3aWR0aDogdGhpcy53aWR0aCwgZGlzYWJsZUNsb3NlOiB0cnVlLCByZXN0b3JlRm9jdXM6IGZhbHNlLCBwYW5lbENsYXNzOiAnYmRjLXdhbGstZGlhbG9nJ30pO1xuICAgIHRoaXMub3BlbmVkLmVtaXQoKTtcbiAgfVxuXG4gIHByaXZhdGUgX2Nsb3NlKCkge1xuICAgIGlmICh0aGlzLmRpYWxvZ1JlZikge1xuICAgICAgdGhpcy5kaWFsb2dSZWYuY2xvc2UoKTtcbiAgICAgIHRoaXMuZGlhbG9nUmVmID0gbnVsbDtcbiAgICAgIHRoaXMuY2xvc2VkLmVtaXQoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9zeW5jKCkge1xuICAgIGlmICh0aGlzLm5hbWUpIHtcbiAgICAgIGlmICghdGhpcy50dXRvcmlhbFNlcnZpY2UuZ2V0VGFza0NvbXBsZXRlZCh0aGlzLm5hbWUpICYmXG4gICAgICAgICF0aGlzLnR1dG9yaWFsU2VydmljZS5kaXNhYmxlZCAmJlxuICAgICAgICB0aGlzLnR1dG9yaWFsU2VydmljZS5ldmFsTXVzdENvbXBsZXRlZCh0aGlzLm11c3RDb21wbGV0ZWQpICYmXG4gICAgICAgIHRoaXMudHV0b3JpYWxTZXJ2aWNlLmV2YWxNdXN0Tm90RGlzcGxheWluZyh0aGlzLm11c3ROb3REaXNwbGF5aW5nKSkge1xuXG4gICAgICAgIGlmICghdGhpcy5kaWFsb2dSZWYpIHtcbiAgICAgICAgICB0aGlzLl9vcGVuKCk7XG4gICAgICAgICAgdGhpcy50dXRvcmlhbFNlcnZpY2Uuc2V0SXNEaXNwbGF5aW5nKHRoaXMubmFtZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy5kaWFsb2dSZWYpIHtcbiAgICAgICAgdGhpcy5fY2xvc2UoKTtcbiAgICAgICAgdGhpcy50dXRvcmlhbFNlcnZpY2Uuc2V0SXNEaXNwbGF5aW5nKHRoaXMubmFtZSwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiPG5nLXRlbXBsYXRlPlxuICA8ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+XG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICA8L2Rpdj5cbjwvbmctdGVtcGxhdGU+XG4iXX0=