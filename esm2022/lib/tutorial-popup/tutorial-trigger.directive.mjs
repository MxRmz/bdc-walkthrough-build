import { OverlayConfig, } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Directive, HostListener, Inject, Input, Optional, PLATFORM_ID, } from '@angular/core';
import { merge, of as observableOf, Subscription } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { MatMenu, MAT_MENU_SCROLL_STRATEGY } from '@angular/material/menu';
import { BdcDisplayEventAction } from '../bdc-walk.service';
import { isPlatformServer } from "@angular/common";
import * as i0 from "@angular/core";
import * as i1 from "../bdc-walk.service";
import * as i2 from "@angular/cdk/overlay";
import * as i3 from "@angular/cdk/bidi";
export class BdcWalkTriggerDirective {
    /** References the popup instance that the trigger is associated with. */
    get popup() {
        return this._popup;
    }
    set popup(popup) {
        if (popup === this._popup) {
            return;
        }
        this._popup = popup;
        this._menu = popup.menu;
        this._menuCloseSubscription.unsubscribe();
        if (popup) {
            this._menuCloseSubscription = popup.menu.closed.subscribe(() => {
                this._destroyMenu();
            });
        }
    }
    constructor(tutorialService, _overlay, _element, _viewContainerRef, platformID, scrollStrategy, _dir, _ngZone) {
        this.tutorialService = tutorialService;
        this._overlay = _overlay;
        this._element = _element;
        this._viewContainerRef = _viewContainerRef;
        this.platformID = platformID;
        this._dir = _dir;
        this._ngZone = _ngZone;
        this._overlayRef = null;
        this._menuOpen = false;
        this._closingActionsSubscription = Subscription.EMPTY;
        this._hoverSubscription = Subscription.EMPTY;
        this._menuCloseSubscription = Subscription.EMPTY;
        this._initialized = false;
        this._contentInited = false;
        this._isTriggerVisible = true;
        this.enabled = true;
        this.mustCompleted = {};
        this._scrollStrategy = scrollStrategy;
    }
    ngOnInit() {
        if (isPlatformServer(this.platformID)) {
            return;
        }
    }
    ngAfterContentInit() {
        this._contentInited = true;
        this._componentSubscription = this.tutorialService.changes.subscribe(() => this._sync());
    }
    ngAfterContentChecked() {
        // detect changes if trigger visibility changed
        const isTriggerVisible = !!this._element.nativeElement.offsetParent;
        if (isTriggerVisible !== this._isTriggerVisible && this._contentInited) {
            this._isTriggerVisible = isTriggerVisible;
            this._sync();
        }
    }
    ngOnChanges() {
        if (this._contentInited) {
            this._sync();
        }
    }
    ngOnDestroy() {
        if (this._componentSubscription) {
            this._componentSubscription.unsubscribe();
        }
        // must disable auto-init and release popup so others may use it
        clearTimeout(this._timer);
        if (this._initialized) {
            this.popup.trigger = null;
            this.popup.data = null;
            this.tutorialService.setIsDisplaying(this.popup.name, false);
        }
        if (this._overlayRef) {
            this._overlayRef.dispose();
            this._overlayRef = null;
        }
        this._menuCloseSubscription.unsubscribe();
        this._closingActionsSubscription.unsubscribe();
        this._hoverSubscription.unsubscribe();
    }
    /** Whether the menu is open. */
    get menuOpen() {
        return this._menuOpen;
    }
    /** The text direction of the containing app. */
    get dir() {
        return this._dir && this._dir.value === 'rtl' ? 'rtl' : 'ltr';
    }
    /** Opens the menu. */
    openMenu() {
        const menu = this._menu;
        if (this._menuOpen || !menu) {
            return;
        }
        const overlayRef = this._createOverlay(menu);
        const overlayConfig = overlayRef.getConfig();
        const positionStrategy = overlayConfig.positionStrategy;
        this._setPosition(menu, positionStrategy);
        overlayConfig.hasBackdrop = menu.hasBackdrop;
        overlayRef.attach(this._getPortal(menu));
        if (menu.lazyContent) {
            menu.lazyContent.attach();
        }
        this._closingActionsSubscription = this._menuClosingActions().subscribe(() => this.closeMenu());
        this._initMenu(menu);
        if (menu instanceof MatMenu) {
            menu._startAnimation();
            menu._directDescendantItems.changes.pipe(takeUntil(menu.close)).subscribe(() => {
                // Re-adjust the position without locking when the amount of items
                // changes so that the overlay is allowed to pick a new optimal position.
                positionStrategy.withLockedPosition(false).reapplyLastPosition();
                positionStrategy.withLockedPosition(true);
            });
        }
    }
    /** Closes the menu. */
    closeMenu() {
        this._menu?.close.emit();
    }
    /**
     * Updates the position of the menu to ensure that it fits all options within the viewport.
     */
    updatePosition() {
        this._overlayRef?.updatePosition();
    }
    /** Closes the menu and does the necessary cleanup. */
    _destroyMenu() {
        if (!this._overlayRef || !this.menuOpen) {
            return;
        }
        const menu = this._menu;
        this._closingActionsSubscription.unsubscribe();
        this._overlayRef.detach();
        if (menu instanceof MatMenu) {
            menu._resetAnimation();
            if (menu.lazyContent) {
                // Wait for the exit animation to finish before detaching the content.
                menu._animationDone
                    .pipe(filter(event => event.toState === 'void'), take(1), 
                // Interrupt if the content got re-attached.
                takeUntil(menu.lazyContent._attached))
                    .subscribe({
                    next: () => menu.lazyContent.detach(),
                    // No matter whether the content got re-attached, reset the menu.
                    complete: () => this._setIsMenuOpen(false),
                });
            }
            else {
                this._setIsMenuOpen(false);
            }
        }
        else {
            this._setIsMenuOpen(false);
            menu?.lazyContent?.detach();
        }
    }
    /**
     * This method sets the menu state to open and focuses the first item if
     * the menu was opened via the keyboard.
     */
    _initMenu(menu) {
        menu.direction = this.dir;
        this._setIsMenuOpen(true);
    }
    // set state rather than toggle to support triggers sharing a menu
    _setIsMenuOpen(isOpen) {
        this._menuOpen = isOpen;
    }
    /**
     * This method creates the overlay from the provided menu's template and saves its
     * OverlayRef so that it can be attached to the DOM when openMenu is called.
     */
    _createOverlay(menu) {
        if (!this._overlayRef) {
            const config = this._getOverlayConfig(menu);
            this._subscribeToPositions(menu, config.positionStrategy);
            this._overlayRef = this._overlay.create(config);
        }
        return this._overlayRef;
    }
    /**
     * This method builds the configuration object needed to create the overlay, the OverlayState.
     * @returns OverlayConfig
     */
    _getOverlayConfig(menu) {
        // override overlay to avoid resizing of popups
        const positionStrategy = this._overlay.position()
            .flexibleConnectedTo(this._element)
            .withPush(true)
            .withFlexibleDimensions(false)
            .withTransformOriginOn('.mat-menu-panel, .mat-mdc-menu-panel');
        // patch positionStrategy to disable push for Y axis
        const curGetExactOverlayY = positionStrategy['_getExactOverlayY'];
        positionStrategy['_getExactOverlayY'] = (...args) => {
            const curIsPushed = positionStrategy['_isPushed'];
            positionStrategy['_isPushed'] = false;
            const value = curGetExactOverlayY.call(positionStrategy, ...args);
            positionStrategy['_isPushed'] = curIsPushed;
            return value;
        };
        return new OverlayConfig({
            positionStrategy,
            scrollStrategy: this._scrollStrategy(),
            direction: this._dir
        });
    }
    /**
     * Listens to changes in the position of the overlay and sets the correct classes
     * on the menu based on the new position. This ensures the animation origin is always
     * correct, even if a fallback position is used for the overlay.
     */
    _subscribeToPositions(menu, position) {
        if (menu.setPositionClasses) {
            position.positionChanges.subscribe(change => {
                const posX = change.connectionPair.overlayX === 'start' ? 'after' : 'before';
                const posY = change.connectionPair.overlayY === 'top' ? 'below' : 'above';
                if (!this._lastPosition || this._lastPosition.originX !== change.connectionPair.originX ||
                    this._lastPosition.originY !== change.connectionPair.originY) {
                    // selected position changed, we must run detect changes to update arrow css
                    this._lastPosition = change.connectionPair;
                    // this._ngZone.run(() => setTimeout(() => {}));
                    this._ngZone.run(() => menu.setPositionClasses(posX, posY));
                }
            });
        }
    }
    /**
     * Sets the appropriate positions on a position strategy
     * so the overlay connects with the trigger correctly.
     */
    _setPosition(menu, positionStrategy) {
        // override position strategy to support open to the sides
        let [originX, originFallbackX] = menu.xPosition === 'before' ? ['end', 'start'] : ['start', 'end'];
        const [overlayY, overlayFallbackY] = menu.yPosition === 'above' ? ['bottom', 'top'] : ['top', 'bottom'];
        let [originY, originFallbackY] = [overlayY, overlayFallbackY];
        let [overlayX, overlayFallbackX] = [originX, originFallbackX];
        // align popup's arrow to center of attached element if element size < 70
        const offsetX = this.popup.offsetX || ((this.popup.alignCenter || (this._element.nativeElement.offsetWidth < 130 &&
            this.popup.alignCenter === undefined)) && !this.popup.horizontal ? (this._element.nativeElement.offsetWidth / -2 + 29) *
            (menu.xPosition === 'before' ? 1 : -1) : 0);
        const offsetY = this.popup.offsetY || ((this.popup.alignCenter || (this._element.nativeElement.offsetHeight < 80 &&
            this.popup.alignCenter === undefined)) && this.popup.horizontal ? (this._element.nativeElement.offsetHeight / 2 - 29) *
            (menu.yPosition === 'below' ? 1 : -1) : 0);
        if (this.popup.horizontal) {
            // When the menu is a sub-menu, it should always align itself
            // to the edges of the trigger, instead of overlapping it.
            overlayFallbackX = originX = menu.xPosition === 'before' ? 'start' : 'end';
            originFallbackX = overlayX = originX === 'end' ? 'start' : 'end';
        }
        else if (!menu.overlapTrigger) {
            originY = overlayY === 'top' ? 'bottom' : 'top';
            originFallbackY = overlayFallbackY === 'top' ? 'bottom' : 'top';
        }
        const original = { originX, originY, overlayX, overlayY, offsetX, offsetY };
        const flipX = { originX: originFallbackX, originY, overlayX: overlayFallbackX, overlayY, offsetX: -offsetX, offsetY };
        const flipY = { originX, originY: originFallbackY, overlayX, overlayY: overlayFallbackY, offsetX, offsetY: -offsetY };
        const flipXY = { originX: originFallbackX, originY: originFallbackY, overlayX: overlayFallbackX, overlayY: overlayFallbackY,
            offsetX: -offsetX, offsetY: -offsetY };
        positionStrategy.withPositions(this.popup.horizontal ? [original, flipX] : [original, flipY, flipXY]);
    }
    /** Returns a stream that emits whenever an action that should close the menu occurs. */
    _menuClosingActions() {
        const backdrop = this._overlayRef.backdropClick();
        const detachments = this._overlayRef.detachments();
        const parentClose = observableOf();
        const hover = observableOf();
        return merge(backdrop, parentClose, hover, detachments);
    }
    /** Gets the portal that should be attached to the overlay. */
    _getPortal(menu) {
        // Note that we can avoid this check by keeping the portal on the menu panel.
        // While it would be cleaner, we'd have to introduce another required method on
        // `MatMenuPanel`, making it harder to consume.
        if (!this._portal || this._portal.templateRef !== menu.templateRef) {
            this._portal = new TemplatePortal(menu.templateRef, this._viewContainerRef);
        }
        return this._portal;
    }
    /// custom code
    _click() {
        // element click
        if (this._initialized && this.popup.closeOnClick) {
            this.close(false);
        }
    }
    _sync() {
        const isTriggerVisible = !!this._element.nativeElement.offsetParent;
        if (this._menu && this.popup.name) {
            if (this.enabled && isTriggerVisible && !this.tutorialService.getTaskCompleted(this.popup.name) &&
                !this.tutorialService.disabled &&
                this.tutorialService.evalMustCompleted(this.mustCompleted) &&
                this.tutorialService.evalMustCompleted(this.popup.mustCompleted) &&
                this.tutorialService.evalMustNotDisplaying(this.popup.mustNotDisplaying)) {
                // should be visible, but let's check if popup not already in use by other trigger (in table or ngFor)
                if (!this.popup.trigger) {
                    this._initialized = true;
                    this.popup.trigger = this;
                    this.popup.data = this.data;
                    clearTimeout(this._timer);
                    this._timer = setTimeout(() => this.openMenu(), 500);
                    this.tutorialService.setIsDisplaying(this.popup.name, true);
                    this.popup.opened.emit();
                }
            }
            else if (this._initialized) {
                // only close if this is our popup (initialized)
                this._initialized = false;
                this.popup.trigger = null;
                this.popup.data = null;
                clearTimeout(this._timer);
                this.closeMenu();
                this.tutorialService.setIsDisplaying(this.popup.name, false);
                this.popup.closed.emit();
            }
        }
    }
    reposition() {
        if (this._initialized && this._componentSubscription) {
            this.closeMenu();
            this.openMenu();
        }
    }
    close(buttonClicked) {
        this.tutorialService.logUserAction(this.popup.name, buttonClicked ? BdcDisplayEventAction.ButtonClicked :
            BdcDisplayEventAction.UserClosed);
        this.tutorialService.setTaskCompleted(this.popup.name);
        this.tutorialService.setTasks(this.popup.onCloseCompleteTask);
        if (buttonClicked) {
            this.tutorialService.setTasks(this.popup.onButtonCompleteTask);
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.8", ngImport: i0, type: BdcWalkTriggerDirective, deps: [{ token: i1.BdcWalkService }, { token: i2.Overlay }, { token: i0.ElementRef }, { token: i0.ViewContainerRef }, { token: PLATFORM_ID }, { token: MAT_MENU_SCROLL_STRATEGY }, { token: i3.Directionality, optional: true }, { token: i0.NgZone }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "17.0.8", type: BdcWalkTriggerDirective, selector: "[bdcWalkTriggerFor]", inputs: { enabled: "enabled", mustCompleted: "mustCompleted", data: "data", popup: ["bdcWalkTriggerFor", "popup"] }, host: { listeners: { "click": "_click()" } }, usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.8", ngImport: i0, type: BdcWalkTriggerDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[bdcWalkTriggerFor]'
                }]
        }], ctorParameters: () => [{ type: i1.BdcWalkService }, { type: i2.Overlay }, { type: i0.ElementRef }, { type: i0.ViewContainerRef }, { type: Object, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [MAT_MENU_SCROLL_STRATEGY]
                }] }, { type: i3.Directionality, decorators: [{
                    type: Optional
                }] }, { type: i0.NgZone }], propDecorators: { enabled: [{
                type: Input
            }], mustCompleted: [{
                type: Input
            }], data: [{
                type: Input
            }], popup: [{
                type: Input,
                args: ['bdcWalkTriggerFor']
            }], _click: [{
                type: HostListener,
                args: ['click']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHV0b3JpYWwtdHJpZ2dlci5kaXJlY3RpdmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9iZGMtd2Fsa3Rocm91Z2gvc3JjL2xpYi90dXRvcmlhbC1wb3B1cC90dXRvcmlhbC10cmlnZ2VyLmRpcmVjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBS0wsYUFBYSxHQUlkLE1BQU0sc0JBQXNCLENBQUM7QUFDOUIsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ25ELE9BQU8sRUFHTCxTQUFTLEVBRUssWUFBWSxFQUMxQixNQUFNLEVBRU4sS0FBSyxFQUdMLFFBQVEsRUFDQSxXQUFXLEdBR3BCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxLQUFLLEVBQWMsRUFBRSxJQUFJLFlBQVksRUFBRSxZQUFZLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDekUsT0FBTyxFQUFRLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDOUQsT0FBTyxFQUFDLE9BQU8sRUFBRSx3QkFBd0IsRUFBNkMsTUFBTSx3QkFBd0IsQ0FBQztBQUVySCxPQUFPLEVBQUMscUJBQXFCLEVBQWlCLE1BQU0scUJBQXFCLENBQUM7QUFDMUUsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7Ozs7O0FBS2pELE1BQU0sT0FBTyx1QkFBdUI7SUFvQmxDLHlFQUF5RTtJQUN6RSxJQUNJLEtBQUs7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLEtBQTRCO1FBQ3BDLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDekIsT0FBTztTQUNSO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxL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SztzQkFEUixLQUFLO3VCQUFDLG1CQUFtQjtnQkEwVTFCLE1BQU07c0JBREwsWUFBWTt1QkFBQyxPQUFPIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtEaXJlY3Rpb24sIERpcmVjdGlvbmFsaXR5fSBmcm9tICdAYW5ndWxhci9jZGsvYmlkaSc7XG5pbXBvcnQge1xuICBDb25uZWN0aW9uUG9zaXRpb25QYWlyLFxuICBGbGV4aWJsZUNvbm5lY3RlZFBvc2l0aW9uU3RyYXRlZ3ksXG4gIEhvcml6b250YWxDb25uZWN0aW9uUG9zLFxuICBPdmVybGF5LFxuICBPdmVybGF5Q29uZmlnLFxuICBPdmVybGF5UmVmLFxuICBTY3JvbGxTdHJhdGVneSxcbiAgVmVydGljYWxDb25uZWN0aW9uUG9zLFxufSBmcm9tICdAYW5ndWxhci9jZGsvb3ZlcmxheSc7XG5pbXBvcnQge1RlbXBsYXRlUG9ydGFsfSBmcm9tICdAYW5ndWxhci9jZGsvcG9ydGFsJztcbmltcG9ydCB7XG4gIEFmdGVyQ29udGVudENoZWNrZWQsXG4gIEFmdGVyQ29udGVudEluaXQsXG4gIERpcmVjdGl2ZSxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLCBIb3N0TGlzdGVuZXIsXG4gIEluamVjdCxcbiAgSW5qZWN0aW9uVG9rZW4sXG4gIElucHV0LFxuICBOZ1pvbmUsIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LCBPbkluaXQsXG4gIE9wdGlvbmFsLFxuICBPdXRwdXQsIFBMQVRGT1JNX0lELFxuICBTZWxmLFxuICBWaWV3Q29udGFpbmVyUmVmLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7bWVyZ2UsIE9ic2VydmFibGUsIG9mIGFzIG9ic2VydmFibGVPZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7ZGVsYXksIGZpbHRlciwgdGFrZSwgdGFrZVVudGlsfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge01hdE1lbnUsIE1BVF9NRU5VX1NDUk9MTF9TVFJBVEVHWSwgTWF0TWVudVBhbmVsLCBNZW51UG9zaXRpb25YLCBNZW51UG9zaXRpb25ZfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9tZW51JztcbmltcG9ydCB7QmRjV2Fsa1BvcHVwQ29tcG9uZW50fSBmcm9tICcuL3R1dG9yaWFsLXBvcHVwLmNvbXBvbmVudCc7XG5pbXBvcnQge0JkY0Rpc3BsYXlFdmVudEFjdGlvbiwgQmRjV2Fsa1NlcnZpY2V9IGZyb20gJy4uL2JkYy13YWxrLnNlcnZpY2UnO1xuaW1wb3J0IHtpc1BsYXRmb3JtU2VydmVyfSBmcm9tIFwiQGFuZ3VsYXIvY29tbW9uXCI7XG5cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ1tiZGNXYWxrVHJpZ2dlckZvcl0nXG59KVxuZXhwb3J0IGNsYXNzIEJkY1dhbGtUcmlnZ2VyRGlyZWN0aXZlIGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3ksIE9uQ2hhbmdlcywgQWZ0ZXJDb250ZW50SW5pdCwgQWZ0ZXJDb250ZW50Q2hlY2tlZCB7XG4gIHByaXZhdGUgX3BvcnRhbDogVGVtcGxhdGVQb3J0YWw7XG4gIHByaXZhdGUgX292ZXJsYXlSZWY6IE92ZXJsYXlSZWYgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBfbWVudU9wZW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBfY2xvc2luZ0FjdGlvbnNTdWJzY3JpcHRpb24gPSBTdWJzY3JpcHRpb24uRU1QVFk7XG4gIHByaXZhdGUgX2hvdmVyU3Vic2NyaXB0aW9uID0gU3Vic2NyaXB0aW9uLkVNUFRZO1xuICBwcml2YXRlIF9tZW51Q2xvc2VTdWJzY3JpcHRpb24gPSBTdWJzY3JpcHRpb24uRU1QVFk7XG4gIHByaXZhdGUgX3Njcm9sbFN0cmF0ZWd5OiAoKSA9PiBTY3JvbGxTdHJhdGVneTtcblxuICBwcml2YXRlIF9jb21wb25lbnRTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBfbGFzdFBvc2l0aW9uOiBDb25uZWN0aW9uUG9zaXRpb25QYWlyO1xuICBwcml2YXRlIF9pbml0aWFsaXplZCA9IGZhbHNlO1xuICBwcml2YXRlIF90aW1lcjogYW55O1xuICBwcml2YXRlIF9jb250ZW50SW5pdGVkID0gZmFsc2U7XG4gIHByaXZhdGUgX2lzVHJpZ2dlclZpc2libGUgPSB0cnVlO1xuXG4gIEBJbnB1dCgpIGVuYWJsZWQgPSB0cnVlO1xuICBASW5wdXQoKSBtdXN0Q29tcGxldGVkOiB7IFt0YXNrTmFtZTogc3RyaW5nXTogYW55IHwgYm9vbGVhbiB9ID0ge307XG4gIEBJbnB1dCgpIGRhdGE6IGFueTtcblxuICAvKiogUmVmZXJlbmNlcyB0aGUgcG9wdXAgaW5zdGFuY2UgdGhhdCB0aGUgdHJpZ2dlciBpcyBhc3NvY2lhdGVkIHdpdGguICovXG4gIEBJbnB1dCgnYmRjV2Fsa1RyaWdnZXJGb3InKVxuICBnZXQgcG9wdXAoKTogQmRjV2Fsa1BvcHVwQ29tcG9uZW50IHtcbiAgICByZXR1cm4gdGhpcy5fcG9wdXA7XG4gIH1cbiAgc2V0IHBvcHVwKHBvcHVwOiBCZGNXYWxrUG9wdXBDb21wb25lbnQpIHtcbiAgICBpZiAocG9wdXAgPT09IHRoaXMuX3BvcHVwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fcG9wdXAgPSBwb3B1cDtcbiAgICB0aGlzLl9tZW51ID0gcG9wdXAubWVudTtcbiAgICB0aGlzLl9tZW51Q2xvc2VTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcblxuICAgIGlmIChwb3B1cCkge1xuICAgICAgdGhpcy5fbWVudUNsb3NlU3Vic2NyaXB0aW9uID0gcG9wdXAubWVudS5jbG9zZWQuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgICAgdGhpcy5fZGVzdHJveU1lbnUoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX21lbnU6IE1hdE1lbnVQYW5lbCB8IG51bGw7XG4gIHByaXZhdGUgX3BvcHVwOiBCZGNXYWxrUG9wdXBDb21wb25lbnQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSB0dXRvcmlhbFNlcnZpY2U6IEJkY1dhbGtTZXJ2aWNlLFxuICAgIHByaXZhdGUgX292ZXJsYXk6IE92ZXJsYXksXG4gICAgcHJpdmF0ZSBfZWxlbWVudDogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4sXG4gICAgcHJpdmF0ZSBfdmlld0NvbnRhaW5lclJlZjogVmlld0NvbnRhaW5lclJlZixcbiAgICBASW5qZWN0KFBMQVRGT1JNX0lEKSBwcml2YXRlIHBsYXRmb3JtSUQ6IE9iamVjdCxcbiAgICBASW5qZWN0KE1BVF9NRU5VX1NDUk9MTF9TVFJBVEVHWSkgc2Nyb2xsU3RyYXRlZ3k6IGFueSxcbiAgICBAT3B0aW9uYWwoKSBwcml2YXRlIF9kaXI6IERpcmVjdGlvbmFsaXR5LFxuICAgIHByaXZhdGUgX25nWm9uZT86IE5nWm9uZSxcbiAgKSB7XG4gICAgdGhpcy5fc2Nyb2xsU3RyYXRlZ3kgPSBzY3JvbGxTdHJhdGVneTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIGlmIChpc1BsYXRmb3JtU2VydmVyKHRoaXMucGxhdGZvcm1JRCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBuZ0FmdGVyQ29udGVudEluaXQoKSB7XG4gICAgdGhpcy5fY29udGVudEluaXRlZCA9IHRydWU7XG4gICAgdGhpcy5fY29tcG9uZW50U3Vic2NyaXB0aW9uID0gdGhpcy50dXRvcmlhbFNlcnZpY2UuY2hhbmdlcy5zdWJzY3JpYmUoKCkgPT4gdGhpcy5fc3luYygpKTtcbiAgfVxuXG4gIG5nQWZ0ZXJDb250ZW50Q2hlY2tlZCgpIHtcbiAgICAvLyBkZXRlY3QgY2hhbmdlcyBpZiB0cmlnZ2VyIHZpc2liaWxpdHkgY2hhbmdlZFxuICAgIGNvbnN0IGlzVHJpZ2dlclZpc2libGUgPSAhIXRoaXMuX2VsZW1lbnQubmF0aXZlRWxlbWVudC5vZmZzZXRQYXJlbnQ7XG5cbiAgICBpZiAoaXNUcmlnZ2VyVmlzaWJsZSAhPT0gdGhpcy5faXNUcmlnZ2VyVmlzaWJsZSAmJiB0aGlzLl9jb250ZW50SW5pdGVkKSB7XG4gICAgICB0aGlzLl9pc1RyaWdnZXJWaXNpYmxlID0gaXNUcmlnZ2VyVmlzaWJsZTtcbiAgICAgIHRoaXMuX3N5bmMoKTtcbiAgICB9XG4gIH1cblxuICBuZ09uQ2hhbmdlcygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fY29udGVudEluaXRlZCkge1xuICAgICAgdGhpcy5fc3luYygpO1xuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLl9jb21wb25lbnRTdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMuX2NvbXBvbmVudFN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIC8vIG11c3QgZGlzYWJsZSBhdXRvLWluaXQgYW5kIHJlbGVhc2UgcG9wdXAgc28gb3RoZXJzIG1heSB1c2UgaXRcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZXIpO1xuXG4gICAgaWYgKHRoaXMuX2luaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLnBvcHVwLnRyaWdnZXIgPSBudWxsO1xuICAgICAgdGhpcy5wb3B1cC5kYXRhID0gbnVsbDtcbiAgICAgIHRoaXMudHV0b3JpYWxTZXJ2aWNlLnNldElzRGlzcGxheWluZyh0aGlzLnBvcHVwLm5hbWUsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fb3ZlcmxheVJlZikge1xuICAgICAgdGhpcy5fb3ZlcmxheVJlZi5kaXNwb3NlKCk7XG4gICAgICB0aGlzLl9vdmVybGF5UmVmID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLl9tZW51Q2xvc2VTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLl9jbG9zaW5nQWN0aW9uc1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMuX2hvdmVyU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvKiogV2hldGhlciB0aGUgbWVudSBpcyBvcGVuLiAqL1xuICBnZXQgbWVudU9wZW4oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX21lbnVPcGVuO1xuICB9XG5cbiAgLyoqIFRoZSB0ZXh0IGRpcmVjdGlvbiBvZiB0aGUgY29udGFpbmluZyBhcHAuICovXG4gIGdldCBkaXIoKTogRGlyZWN0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5fZGlyICYmIHRoaXMuX2Rpci52YWx1ZSA9PT0gJ3J0bCcgPyAncnRsJyA6ICdsdHInO1xuICB9XG5cbiAgLyoqIE9wZW5zIHRoZSBtZW51LiAqL1xuICBvcGVuTWVudSgpOiB2b2lkIHtcbiAgICBjb25zdCBtZW51ID0gdGhpcy5fbWVudTtcblxuICAgIGlmICh0aGlzLl9tZW51T3BlbiB8fCAhbWVudSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG92ZXJsYXlSZWYgPSB0aGlzLl9jcmVhdGVPdmVybGF5KG1lbnUpO1xuICAgIGNvbnN0IG92ZXJsYXlDb25maWcgPSBvdmVybGF5UmVmLmdldENvbmZpZygpO1xuICAgIGNvbnN0IHBvc2l0aW9uU3RyYXRlZ3kgPSBvdmVybGF5Q29uZmlnLnBvc2l0aW9uU3RyYXRlZ3kgYXMgRmxleGlibGVDb25uZWN0ZWRQb3NpdGlvblN0cmF0ZWd5O1xuXG4gICAgdGhpcy5fc2V0UG9zaXRpb24obWVudSwgcG9zaXRpb25TdHJhdGVneSk7XG4gICAgb3ZlcmxheUNvbmZpZy5oYXNCYWNrZHJvcCA9IG1lbnUuaGFzQmFja2Ryb3A7XG4gICAgb3ZlcmxheVJlZi5hdHRhY2godGhpcy5fZ2V0UG9ydGFsKG1lbnUpKTtcblxuICAgIGlmIChtZW51LmxhenlDb250ZW50KSB7XG4gICAgICBtZW51LmxhenlDb250ZW50LmF0dGFjaCgpO1xuICAgIH1cblxuICAgIHRoaXMuX2Nsb3NpbmdBY3Rpb25zU3Vic2NyaXB0aW9uID0gdGhpcy5fbWVudUNsb3NpbmdBY3Rpb25zKCkuc3Vic2NyaWJlKCgpID0+IHRoaXMuY2xvc2VNZW51KCkpO1xuICAgIHRoaXMuX2luaXRNZW51KG1lbnUpO1xuXG4gICAgaWYgKG1lbnUgaW5zdGFuY2VvZiBNYXRNZW51KSB7XG4gICAgICBtZW51Ll9zdGFydEFuaW1hdGlvbigpO1xuICAgICAgbWVudS5fZGlyZWN0RGVzY2VuZGFudEl0ZW1zLmNoYW5nZXMucGlwZSh0YWtlVW50aWwobWVudS5jbG9zZSkpLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgIC8vIFJlLWFkanVzdCB0aGUgcG9zaXRpb24gd2l0aG91dCBsb2NraW5nIHdoZW4gdGhlIGFtb3VudCBvZiBpdGVtc1xuICAgICAgICAvLyBjaGFuZ2VzIHNvIHRoYXQgdGhlIG92ZXJsYXkgaXMgYWxsb3dlZCB0byBwaWNrIGEgbmV3IG9wdGltYWwgcG9zaXRpb24uXG4gICAgICAgIHBvc2l0aW9uU3RyYXRlZ3kud2l0aExvY2tlZFBvc2l0aW9uKGZhbHNlKS5yZWFwcGx5TGFzdFBvc2l0aW9uKCk7XG4gICAgICAgIHBvc2l0aW9uU3RyYXRlZ3kud2l0aExvY2tlZFBvc2l0aW9uKHRydWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENsb3NlcyB0aGUgbWVudS4gKi9cbiAgY2xvc2VNZW51KCk6IHZvaWQge1xuICAgIHRoaXMuX21lbnU/LmNsb3NlLmVtaXQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgbWVudSB0byBlbnN1cmUgdGhhdCBpdCBmaXRzIGFsbCBvcHRpb25zIHdpdGhpbiB0aGUgdmlld3BvcnQuXG4gICAqL1xuICB1cGRhdGVQb3NpdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLl9vdmVybGF5UmVmPy51cGRhdGVQb3NpdGlvbigpO1xuICB9XG5cbiAgLyoqIENsb3NlcyB0aGUgbWVudSBhbmQgZG9lcyB0aGUgbmVjZXNzYXJ5IGNsZWFudXAuICovXG4gIHByaXZhdGUgX2Rlc3Ryb3lNZW51KCkge1xuICAgIGlmICghdGhpcy5fb3ZlcmxheVJlZiB8fCAhdGhpcy5tZW51T3Blbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbnUgPSB0aGlzLl9tZW51O1xuICAgIHRoaXMuX2Nsb3NpbmdBY3Rpb25zU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgdGhpcy5fb3ZlcmxheVJlZi5kZXRhY2goKTtcblxuICAgIGlmIChtZW51IGluc3RhbmNlb2YgTWF0TWVudSkge1xuICAgICAgbWVudS5fcmVzZXRBbmltYXRpb24oKTtcblxuICAgICAgaWYgKG1lbnUubGF6eUNvbnRlbnQpIHtcbiAgICAgICAgLy8gV2FpdCBmb3IgdGhlIGV4aXQgYW5pbWF0aW9uIHRvIGZpbmlzaCBiZWZvcmUgZGV0YWNoaW5nIHRoZSBjb250ZW50LlxuICAgICAgICBtZW51Ll9hbmltYXRpb25Eb25lXG4gICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBmaWx0ZXIoZXZlbnQgPT4gZXZlbnQudG9TdGF0ZSA9PT0gJ3ZvaWQnKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAvLyBJbnRlcnJ1cHQgaWYgdGhlIGNvbnRlbnQgZ290IHJlLWF0dGFjaGVkLlxuICAgICAgICAgICAgdGFrZVVudGlsKG1lbnUubGF6eUNvbnRlbnQuX2F0dGFjaGVkKSxcbiAgICAgICAgICApXG4gICAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgICBuZXh0OiAoKSA9PiBtZW51LmxhenlDb250ZW50IS5kZXRhY2goKSxcbiAgICAgICAgICAgIC8vIE5vIG1hdHRlciB3aGV0aGVyIHRoZSBjb250ZW50IGdvdCByZS1hdHRhY2hlZCwgcmVzZXQgdGhlIG1lbnUuXG4gICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4gdGhpcy5fc2V0SXNNZW51T3BlbihmYWxzZSksXG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zZXRJc01lbnVPcGVuKGZhbHNlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2V0SXNNZW51T3BlbihmYWxzZSk7XG4gICAgICBtZW51Py5sYXp5Q29udGVudD8uZGV0YWNoKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIHNldHMgdGhlIG1lbnUgc3RhdGUgdG8gb3BlbiBhbmQgZm9jdXNlcyB0aGUgZmlyc3QgaXRlbSBpZlxuICAgKiB0aGUgbWVudSB3YXMgb3BlbmVkIHZpYSB0aGUga2V5Ym9hcmQuXG4gICAqL1xuICBwcml2YXRlIF9pbml0TWVudShtZW51OiBNYXRNZW51UGFuZWwpOiB2b2lkIHtcbiAgICBtZW51LmRpcmVjdGlvbiA9IHRoaXMuZGlyO1xuICAgIHRoaXMuX3NldElzTWVudU9wZW4odHJ1ZSk7XG4gIH1cblxuICAvLyBzZXQgc3RhdGUgcmF0aGVyIHRoYW4gdG9nZ2xlIHRvIHN1cHBvcnQgdHJpZ2dlcnMgc2hhcmluZyBhIG1lbnVcbiAgcHJpdmF0ZSBfc2V0SXNNZW51T3Blbihpc09wZW46IGJvb2xlYW4pOiB2b2lkIHtcbiAgICB0aGlzLl9tZW51T3BlbiA9IGlzT3BlbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBjcmVhdGVzIHRoZSBvdmVybGF5IGZyb20gdGhlIHByb3ZpZGVkIG1lbnUncyB0ZW1wbGF0ZSBhbmQgc2F2ZXMgaXRzXG4gICAqIE92ZXJsYXlSZWYgc28gdGhhdCBpdCBjYW4gYmUgYXR0YWNoZWQgdG8gdGhlIERPTSB3aGVuIG9wZW5NZW51IGlzIGNhbGxlZC5cbiAgICovXG4gIHByaXZhdGUgX2NyZWF0ZU92ZXJsYXkobWVudTogTWF0TWVudVBhbmVsKTogT3ZlcmxheVJlZiB7XG4gICAgaWYgKCF0aGlzLl9vdmVybGF5UmVmKSB7XG4gICAgICBjb25zdCBjb25maWcgPSB0aGlzLl9nZXRPdmVybGF5Q29uZmlnKG1lbnUpO1xuICAgICAgdGhpcy5fc3Vic2NyaWJlVG9Qb3NpdGlvbnMoXG4gICAgICAgIG1lbnUsXG4gICAgICAgIGNvbmZpZy5wb3NpdGlvblN0cmF0ZWd5IGFzIEZsZXhpYmxlQ29ubmVjdGVkUG9zaXRpb25TdHJhdGVneSxcbiAgICAgICk7XG4gICAgICB0aGlzLl9vdmVybGF5UmVmID0gdGhpcy5fb3ZlcmxheS5jcmVhdGUoY29uZmlnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fb3ZlcmxheVJlZjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBidWlsZHMgdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IG5lZWRlZCB0byBjcmVhdGUgdGhlIG92ZXJsYXksIHRoZSBPdmVybGF5U3RhdGUuXG4gICAqIEByZXR1cm5zIE92ZXJsYXlDb25maWdcbiAgICovXG4gIHByaXZhdGUgX2dldE92ZXJsYXlDb25maWcobWVudTogTWF0TWVudVBhbmVsKTogT3ZlcmxheUNvbmZpZyB7XG4gICAgLy8gb3ZlcnJpZGUgb3ZlcmxheSB0byBhdm9pZCByZXNpemluZyBvZiBwb3B1cHNcbiAgICBjb25zdCBwb3NpdGlvblN0cmF0ZWd5ID0gdGhpcy5fb3ZlcmxheS5wb3NpdGlvbigpXG4gICAgICAuZmxleGlibGVDb25uZWN0ZWRUbyh0aGlzLl9lbGVtZW50KVxuICAgICAgLndpdGhQdXNoKHRydWUpXG4gICAgICAud2l0aEZsZXhpYmxlRGltZW5zaW9ucyhmYWxzZSlcbiAgICAgIC53aXRoVHJhbnNmb3JtT3JpZ2luT24oJy5tYXQtbWVudS1wYW5lbCwgLm1hdC1tZGMtbWVudS1wYW5lbCcpO1xuXG4gICAgLy8gcGF0Y2ggcG9zaXRpb25TdHJhdGVneSB0byBkaXNhYmxlIHB1c2ggZm9yIFkgYXhpc1xuICAgIGNvbnN0IGN1ckdldEV4YWN0T3ZlcmxheVkgPSBwb3NpdGlvblN0cmF0ZWd5WydfZ2V0RXhhY3RPdmVybGF5WSddO1xuXG4gICAgcG9zaXRpb25TdHJhdGVneVsnX2dldEV4YWN0T3ZlcmxheVknXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICBjb25zdCBjdXJJc1B1c2hlZCA9IHBvc2l0aW9uU3RyYXRlZ3lbJ19pc1B1c2hlZCddO1xuICAgICAgcG9zaXRpb25TdHJhdGVneVsnX2lzUHVzaGVkJ10gPSBmYWxzZTtcbiAgICAgIGNvbnN0IHZhbHVlID0gY3VyR2V0RXhhY3RPdmVybGF5WS5jYWxsKHBvc2l0aW9uU3RyYXRlZ3ksIC4uLmFyZ3MpO1xuICAgICAgcG9zaXRpb25TdHJhdGVneVsnX2lzUHVzaGVkJ10gPSBjdXJJc1B1c2hlZDtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBPdmVybGF5Q29uZmlnKHtcbiAgICAgIHBvc2l0aW9uU3RyYXRlZ3ksXG4gICAgICBzY3JvbGxTdHJhdGVneTogdGhpcy5fc2Nyb2xsU3RyYXRlZ3koKSxcbiAgICAgIGRpcmVjdGlvbjogdGhpcy5fZGlyXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdGVucyB0byBjaGFuZ2VzIGluIHRoZSBwb3NpdGlvbiBvZiB0aGUgb3ZlcmxheSBhbmQgc2V0cyB0aGUgY29ycmVjdCBjbGFzc2VzXG4gICAqIG9uIHRoZSBtZW51IGJhc2VkIG9uIHRoZSBuZXcgcG9zaXRpb24uIFRoaXMgZW5zdXJlcyB0aGUgYW5pbWF0aW9uIG9yaWdpbiBpcyBhbHdheXNcbiAgICogY29ycmVjdCwgZXZlbiBpZiBhIGZhbGxiYWNrIHBvc2l0aW9uIGlzIHVzZWQgZm9yIHRoZSBvdmVybGF5LlxuICAgKi9cbiAgcHJpdmF0ZSBfc3Vic2NyaWJlVG9Qb3NpdGlvbnMobWVudTogTWF0TWVudVBhbmVsLCBwb3NpdGlvbjogRmxleGlibGVDb25uZWN0ZWRQb3NpdGlvblN0cmF0ZWd5KSB7XG4gICAgaWYgKG1lbnUuc2V0UG9zaXRpb25DbGFzc2VzKSB7XG4gICAgICBwb3NpdGlvbi5wb3NpdGlvbkNoYW5nZXMuc3Vic2NyaWJlKGNoYW5nZSA9PiB7XG4gICAgICAgIGNvbnN0IHBvc1g6IE1lbnVQb3NpdGlvblggPSBjaGFuZ2UuY29ubmVjdGlvblBhaXIub3ZlcmxheVggPT09ICdzdGFydCcgPyAnYWZ0ZXInIDogJ2JlZm9yZSc7XG4gICAgICAgIGNvbnN0IHBvc1k6IE1lbnVQb3NpdGlvblkgPSBjaGFuZ2UuY29ubmVjdGlvblBhaXIub3ZlcmxheVkgPT09ICd0b3AnID8gJ2JlbG93JyA6ICdhYm92ZSc7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9sYXN0UG9zaXRpb24gfHwgdGhpcy5fbGFzdFBvc2l0aW9uLm9yaWdpblggIT09IGNoYW5nZS5jb25uZWN0aW9uUGFpci5vcmlnaW5YIHx8XG4gICAgICAgICAgdGhpcy5fbGFzdFBvc2l0aW9uLm9yaWdpblkgIT09IGNoYW5nZS5jb25uZWN0aW9uUGFpci5vcmlnaW5ZKSB7XG4gICAgICAgICAgLy8gc2VsZWN0ZWQgcG9zaXRpb24gY2hhbmdlZCwgd2UgbXVzdCBydW4gZGV0ZWN0IGNoYW5nZXMgdG8gdXBkYXRlIGFycm93IGNzc1xuICAgICAgICAgIHRoaXMuX2xhc3RQb3NpdGlvbiA9IGNoYW5nZS5jb25uZWN0aW9uUGFpcjtcbiAgICAgICAgICAvLyB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IHNldFRpbWVvdXQoKCkgPT4ge30pKTtcbiAgICAgICAgICB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IG1lbnUuc2V0UG9zaXRpb25DbGFzc2VzKHBvc1gsIHBvc1kpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGFwcHJvcHJpYXRlIHBvc2l0aW9ucyBvbiBhIHBvc2l0aW9uIHN0cmF0ZWd5XG4gICAqIHNvIHRoZSBvdmVybGF5IGNvbm5lY3RzIHdpdGggdGhlIHRyaWdnZXIgY29ycmVjdGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBfc2V0UG9zaXRpb24obWVudTogTWF0TWVudVBhbmVsLCBwb3NpdGlvblN0cmF0ZWd5OiBGbGV4aWJsZUNvbm5lY3RlZFBvc2l0aW9uU3RyYXRlZ3kpIHtcbiAgICAvLyBvdmVycmlkZSBwb3NpdGlvbiBzdHJhdGVneSB0byBzdXBwb3J0IG9wZW4gdG8gdGhlIHNpZGVzXG4gICAgbGV0IFtvcmlnaW5YLCBvcmlnaW5GYWxsYmFja1hdOiBIb3Jpem9udGFsQ29ubmVjdGlvblBvc1tdID1cbiAgICAgIG1lbnUueFBvc2l0aW9uID09PSAnYmVmb3JlJyA/IFsnZW5kJywgJ3N0YXJ0J10gOiBbJ3N0YXJ0JywgJ2VuZCddO1xuXG4gICAgY29uc3QgW292ZXJsYXlZLCBvdmVybGF5RmFsbGJhY2tZXTogVmVydGljYWxDb25uZWN0aW9uUG9zW10gPVxuICAgICAgbWVudS55UG9zaXRpb24gPT09ICdhYm92ZScgPyBbJ2JvdHRvbScsICd0b3AnXSA6IFsndG9wJywgJ2JvdHRvbSddO1xuXG4gICAgbGV0IFtvcmlnaW5ZLCBvcmlnaW5GYWxsYmFja1ldID0gW292ZXJsYXlZLCBvdmVybGF5RmFsbGJhY2tZXTtcbiAgICBsZXQgW292ZXJsYXlYLCBvdmVybGF5RmFsbGJhY2tYXSA9IFtvcmlnaW5YLCBvcmlnaW5GYWxsYmFja1hdO1xuXG4gICAgLy8gYWxpZ24gcG9wdXAncyBhcnJvdyB0byBjZW50ZXIgb2YgYXR0YWNoZWQgZWxlbWVudCBpZiBlbGVtZW50IHNpemUgPCA3MFxuICAgIGNvbnN0IG9mZnNldFggPSB0aGlzLnBvcHVwLm9mZnNldFggfHwgKCh0aGlzLnBvcHVwLmFsaWduQ2VudGVyIHx8ICh0aGlzLl9lbGVtZW50Lm5hdGl2ZUVsZW1lbnQub2Zmc2V0V2lkdGggPCAxMzAgJiZcbiAgICAgIHRoaXMucG9wdXAuYWxpZ25DZW50ZXIgPT09IHVuZGVmaW5lZCkpICYmICF0aGlzLnBvcHVwLmhvcml6b250YWwgPyAodGhpcy5fZWxlbWVudC5uYXRpdmVFbGVtZW50Lm9mZnNldFdpZHRoIC8gLTIgKyAyOSkgKlxuICAgICAgKG1lbnUueFBvc2l0aW9uID09PSAnYmVmb3JlJyA/IDEgOiAtMSkgOiAwKTtcblxuICAgIGNvbnN0IG9mZnNldFkgPSB0aGlzLnBvcHVwLm9mZnNldFkgfHwgKCh0aGlzLnBvcHVwLmFsaWduQ2VudGVyIHx8ICh0aGlzLl9lbGVtZW50Lm5hdGl2ZUVsZW1lbnQub2Zmc2V0SGVpZ2h0IDwgODAgJiZcbiAgICAgIHRoaXMucG9wdXAuYWxpZ25DZW50ZXIgPT09IHVuZGVmaW5lZCkpICYmIHRoaXMucG9wdXAuaG9yaXpvbnRhbCA/ICh0aGlzLl9lbGVtZW50Lm5hdGl2ZUVsZW1lbnQub2Zmc2V0SGVpZ2h0IC8gMiAtIDI5KSAqXG4gICAgICAobWVudS55UG9zaXRpb24gPT09ICdiZWxvdycgPyAxIDogLTEpIDogMCk7XG5cbiAgICBpZiAodGhpcy5wb3B1cC5ob3Jpem9udGFsKSB7XG4gICAgICAvLyBXaGVuIHRoZSBtZW51IGlzIGEgc3ViLW1lbnUsIGl0IHNob3VsZCBhbHdheXMgYWxpZ24gaXRzZWxmXG4gICAgICAvLyB0byB0aGUgZWRnZXMgb2YgdGhlIHRyaWdnZXIsIGluc3RlYWQgb2Ygb3ZlcmxhcHBpbmcgaXQuXG4gICAgICBvdmVybGF5RmFsbGJhY2tYID0gb3JpZ2luWCA9IG1lbnUueFBvc2l0aW9uID09PSAnYmVmb3JlJyA/ICdzdGFydCcgOiAnZW5kJztcbiAgICAgIG9yaWdpbkZhbGxiYWNrWCA9IG92ZXJsYXlYID0gb3JpZ2luWCA9PT0gJ2VuZCcgPyAnc3RhcnQnIDogJ2VuZCc7XG4gICAgfSBlbHNlIGlmICghbWVudS5vdmVybGFwVHJpZ2dlcikge1xuICAgICAgb3JpZ2luWSA9IG92ZXJsYXlZID09PSAndG9wJyA/ICdib3R0b20nIDogJ3RvcCc7XG4gICAgICBvcmlnaW5GYWxsYmFja1kgPSBvdmVybGF5RmFsbGJhY2tZID09PSAndG9wJyA/ICdib3R0b20nIDogJ3RvcCc7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luYWwgPSB7b3JpZ2luWCwgb3JpZ2luWSwgb3ZlcmxheVgsIG92ZXJsYXlZLCBvZmZzZXRYLCBvZmZzZXRZfTtcbiAgICBjb25zdCBmbGlwWCA9IHtvcmlnaW5YOiBvcmlnaW5GYWxsYmFja1gsIG9yaWdpblksIG92ZXJsYXlYOiBvdmVybGF5RmFsbGJhY2tYLCBvdmVybGF5WSwgb2Zmc2V0WDogLW9mZnNldFgsIG9mZnNldFl9O1xuICAgIGNvbnN0IGZsaXBZID0ge29yaWdpblgsIG9yaWdpblk6IG9yaWdpbkZhbGxiYWNrWSwgb3ZlcmxheVgsIG92ZXJsYXlZOiBvdmVybGF5RmFsbGJhY2tZLCBvZmZzZXRYLCBvZmZzZXRZOiAtb2Zmc2V0WX07XG4gICAgY29uc3QgZmxpcFhZID0ge29yaWdpblg6IG9yaWdpbkZhbGxiYWNrWCwgb3JpZ2luWTogb3JpZ2luRmFsbGJhY2tZLCBvdmVybGF5WDogb3ZlcmxheUZhbGxiYWNrWCwgb3ZlcmxheVk6IG92ZXJsYXlGYWxsYmFja1ksXG4gICAgICBvZmZzZXRYOiAtb2Zmc2V0WCwgb2Zmc2V0WTogLW9mZnNldFl9O1xuXG4gICAgcG9zaXRpb25TdHJhdGVneS53aXRoUG9zaXRpb25zKHRoaXMucG9wdXAuaG9yaXpvbnRhbCA/IFtvcmlnaW5hbCwgZmxpcFhdIDogW29yaWdpbmFsLCBmbGlwWSwgZmxpcFhZXSk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIHN0cmVhbSB0aGF0IGVtaXRzIHdoZW5ldmVyIGFuIGFjdGlvbiB0aGF0IHNob3VsZCBjbG9zZSB0aGUgbWVudSBvY2N1cnMuICovXG4gIHByaXZhdGUgX21lbnVDbG9zaW5nQWN0aW9ucygpIHtcbiAgICBjb25zdCBiYWNrZHJvcCA9IHRoaXMuX292ZXJsYXlSZWYhLmJhY2tkcm9wQ2xpY2soKTtcbiAgICBjb25zdCBkZXRhY2htZW50cyA9IHRoaXMuX292ZXJsYXlSZWYhLmRldGFjaG1lbnRzKCk7XG4gICAgY29uc3QgcGFyZW50Q2xvc2UgPSBvYnNlcnZhYmxlT2YoKTtcbiAgICBjb25zdCBob3ZlciA9IG9ic2VydmFibGVPZigpO1xuXG4gICAgcmV0dXJuIG1lcmdlKGJhY2tkcm9wLCBwYXJlbnRDbG9zZSBhcyBPYnNlcnZhYmxlPHZvaWQ+LCBob3ZlciwgZGV0YWNobWVudHMpO1xuICB9XG5cbiAgLyoqIEdldHMgdGhlIHBvcnRhbCB0aGF0IHNob3VsZCBiZSBhdHRhY2hlZCB0byB0aGUgb3ZlcmxheS4gKi9cbiAgcHJpdmF0ZSBfZ2V0UG9ydGFsKG1lbnU6IE1hdE1lbnVQYW5lbCk6IFRlbXBsYXRlUG9ydGFsIHtcbiAgICAvLyBOb3RlIHRoYXQgd2UgY2FuIGF2b2lkIHRoaXMgY2hlY2sgYnkga2VlcGluZyB0aGUgcG9ydGFsIG9uIHRoZSBtZW51IHBhbmVsLlxuICAgIC8vIFdoaWxlIGl0IHdvdWxkIGJlIGNsZWFuZXIsIHdlJ2QgaGF2ZSB0byBpbnRyb2R1Y2UgYW5vdGhlciByZXF1aXJlZCBtZXRob2Qgb25cbiAgICAvLyBgTWF0TWVudVBhbmVsYCwgbWFraW5nIGl0IGhhcmRlciB0byBjb25zdW1lLlxuICAgIGlmICghdGhpcy5fcG9ydGFsIHx8IHRoaXMuX3BvcnRhbC50ZW1wbGF0ZVJlZiAhPT0gbWVudS50ZW1wbGF0ZVJlZikge1xuICAgICAgdGhpcy5fcG9ydGFsID0gbmV3IFRlbXBsYXRlUG9ydGFsKG1lbnUudGVtcGxhdGVSZWYsIHRoaXMuX3ZpZXdDb250YWluZXJSZWYpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9wb3J0YWw7XG4gIH1cblxuICAvLy8gY3VzdG9tIGNvZGVcblxuICBASG9zdExpc3RlbmVyKCdjbGljaycpXG4gIF9jbGljaygpIHtcbiAgICAvLyBlbGVtZW50IGNsaWNrXG4gICAgaWYgKHRoaXMuX2luaXRpYWxpemVkICYmIHRoaXMucG9wdXAuY2xvc2VPbkNsaWNrKSB7XG4gICAgICB0aGlzLmNsb3NlKGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9zeW5jKCkge1xuICAgIGNvbnN0IGlzVHJpZ2dlclZpc2libGUgPSAhIXRoaXMuX2VsZW1lbnQubmF0aXZlRWxlbWVudC5vZmZzZXRQYXJlbnQ7XG5cbiAgICBpZiAodGhpcy5fbWVudSAmJiB0aGlzLnBvcHVwLm5hbWUpIHtcbiAgICAgIGlmICh0aGlzLmVuYWJsZWQgJiYgaXNUcmlnZ2VyVmlzaWJsZSAmJiAhdGhpcy50dXRvcmlhbFNlcnZpY2UuZ2V0VGFza0NvbXBsZXRlZCh0aGlzLnBvcHVwLm5hbWUpICYmXG4gICAgICAgICF0aGlzLnR1dG9yaWFsU2VydmljZS5kaXNhYmxlZCAmJlxuICAgICAgICB0aGlzLnR1dG9yaWFsU2VydmljZS5ldmFsTXVzdENvbXBsZXRlZCh0aGlzLm11c3RDb21wbGV0ZWQpICYmXG4gICAgICAgIHRoaXMudHV0b3JpYWxTZXJ2aWNlLmV2YWxNdXN0Q29tcGxldGVkKHRoaXMucG9wdXAubXVzdENvbXBsZXRlZCkgJiZcbiAgICAgICAgdGhpcy50dXRvcmlhbFNlcnZpY2UuZXZhbE11c3ROb3REaXNwbGF5aW5nKHRoaXMucG9wdXAubXVzdE5vdERpc3BsYXlpbmcpKSB7XG5cbiAgICAgICAgLy8gc2hvdWxkIGJlIHZpc2libGUsIGJ1dCBsZXQncyBjaGVjayBpZiBwb3B1cCBub3QgYWxyZWFkeSBpbiB1c2UgYnkgb3RoZXIgdHJpZ2dlciAoaW4gdGFibGUgb3IgbmdGb3IpXG4gICAgICAgIGlmICghdGhpcy5wb3B1cC50cmlnZ2VyKSB7XG4gICAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMucG9wdXAudHJpZ2dlciA9IHRoaXM7XG4gICAgICAgICAgdGhpcy5wb3B1cC5kYXRhID0gdGhpcy5kYXRhO1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lcik7XG4gICAgICAgICAgdGhpcy5fdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMub3Blbk1lbnUoKSwgNTAwKTtcbiAgICAgICAgICB0aGlzLnR1dG9yaWFsU2VydmljZS5zZXRJc0Rpc3BsYXlpbmcodGhpcy5wb3B1cC5uYW1lLCB0cnVlKTtcbiAgICAgICAgICB0aGlzLnBvcHVwLm9wZW5lZC5lbWl0KCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy5faW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgLy8gb25seSBjbG9zZSBpZiB0aGlzIGlzIG91ciBwb3B1cCAoaW5pdGlhbGl6ZWQpXG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMucG9wdXAudHJpZ2dlciA9IG51bGw7XG4gICAgICAgIHRoaXMucG9wdXAuZGF0YSA9IG51bGw7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lcik7XG4gICAgICAgIHRoaXMuY2xvc2VNZW51KCk7XG4gICAgICAgIHRoaXMudHV0b3JpYWxTZXJ2aWNlLnNldElzRGlzcGxheWluZyh0aGlzLnBvcHVwLm5hbWUsIGZhbHNlKTtcbiAgICAgICAgdGhpcy5wb3B1cC5jbG9zZWQuZW1pdCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlcG9zaXRpb24oKSB7XG4gICAgaWYgKHRoaXMuX2luaXRpYWxpemVkICYmIHRoaXMuX2NvbXBvbmVudFN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5jbG9zZU1lbnUoKTtcbiAgICAgIHRoaXMub3Blbk1lbnUoKTtcbiAgICB9XG4gIH1cblxuICBjbG9zZShidXR0b25DbGlja2VkOiBib29sZWFuKSB7XG4gICAgdGhpcy50dXRvcmlhbFNlcnZpY2UubG9nVXNlckFjdGlvbih0aGlzLnBvcHVwLm5hbWUsIGJ1dHRvbkNsaWNrZWQgPyBCZGNEaXNwbGF5RXZlbnRBY3Rpb24uQnV0dG9uQ2xpY2tlZCA6XG4gICAgICBCZGNEaXNwbGF5RXZlbnRBY3Rpb24uVXNlckNsb3NlZCk7XG4gICAgdGhpcy50dXRvcmlhbFNlcnZpY2Uuc2V0VGFza0NvbXBsZXRlZCh0aGlzLnBvcHVwLm5hbWUpO1xuICAgIHRoaXMudHV0b3JpYWxTZXJ2aWNlLnNldFRhc2tzKHRoaXMucG9wdXAub25DbG9zZUNvbXBsZXRlVGFzayk7XG5cbiAgICBpZiAoYnV0dG9uQ2xpY2tlZCkge1xuICAgICAgdGhpcy50dXRvcmlhbFNlcnZpY2Uuc2V0VGFza3ModGhpcy5wb3B1cC5vbkJ1dHRvbkNvbXBsZXRlVGFzayk7XG4gICAgfVxuICB9XG59XG4iXX0=