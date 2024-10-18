import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import * as _ from 'lodash';
import * as i0 from "@angular/core";
export class BdcWalkService {
    get disabled() {
        return this._disabled;
    }
    constructor() {
        this._notify = new BehaviorSubject(null);
        this._notifyDisplaying = new Subject();
        this._displaying = {};
        this._version = 1;
        this._key = 'bdcWalkthrough';
        this._disabled = false;
        this.changes = this._notify.asObservable();
        this.changesDisplaying = this._notifyDisplaying.asObservable();
        this._values = JSON.parse(localStorage.getItem(this._key)) || {};
        // reset all values if version is different
        if (this._values.version !== this._version) {
            this.reset();
        }
    }
    migrate(migrations) {
        const version = this._values.migrationVersion || 0;
        migrations.filter(migration => migration.version > version).forEach(migration => {
            console.log(`Running bdc-migration version ${migration.version}`);
            migration.operations.forEach(operation => {
                if (this.evalMustCompleted(operation.condition)) {
                    Object.entries(operation.then).forEach(([id, data]) => {
                        if (data) {
                            this._values[id] = data;
                        }
                        else {
                            delete this._values[id];
                        }
                    });
                }
            });
            this._values.migrationVersion = migration.version;
        });
        this.save();
    }
    getIsDisplaying(id) {
        return this._displaying[id] || false;
    }
    setIsDisplaying(id, visible) {
        if (this._displaying[id] !== visible) {
            if (visible) {
                this._displaying[id] = visible;
            }
            else {
                delete this._displaying[id];
            }
            this._notify.next();
            this._notifyDisplaying.next({ id, visible, action: BdcDisplayEventAction.VisibilityChanged });
        }
    }
    logUserAction(id, action) {
        this._notifyDisplaying.next({ id, visible: false, action });
    }
    getTaskCompleted(id) {
        return this._values[id] || false;
    }
    setTaskCompleted(id, value = true) {
        if (this._values[id] !== value && value) {
            this._values[id] = value;
            this.save();
        }
        else if (this._values.hasOwnProperty(id) && !value) {
            delete this._values[id];
            this.save();
        }
    }
    setTasks(tasks) {
        let changed = false;
        Object.entries(tasks).forEach(([id, data]) => {
            if (this._values[id] !== data && data) {
                this._values[id] = data;
                changed = true;
            }
            else if (this._values.hasOwnProperty(id) && !data) {
                delete this._values[id];
                changed = true;
            }
        });
        if (changed) {
            this.save();
        }
    }
    getTasks() {
        return { ...this._values };
    }
    reset(prefix) {
        if (prefix) {
            // remove only keys prefixed with param
            Object.keys(this._values).filter(key => key.startsWith(prefix)).forEach(keyToRemove => delete this._values[keyToRemove]);
        }
        else {
            // remove all keys
            this._values = { version: this._version };
        }
        this.save();
    }
    disableAll(disabled = true) {
        this._disabled = disabled;
        this._notify.next();
    }
    _isCompleteMatch(name, value) {
        const src = this.getTaskCompleted(name);
        return this._isEqual(src, value) || (typeof (value) === 'object' && _.isMatch(src, value));
    }
    _isEqual(src, value) {
        if (src === value) {
            return true;
        }
        else if (src !== false && value === true) {
            // we can compare value of true with any source
            return true;
        }
        else if (typeof (value) === 'string') {
            // support not (!) less than (<) or greater than (>) comparisons
            const op = value[0];
            const compValue = value.substr(1);
            if ((op === '!' && compValue != src) || (op === '<' && src < compValue) || (op === '>' && src > compValue)) {
                return true;
            }
        }
    }
    evalMustCompleted(mustCompleted) {
        return Object.entries(mustCompleted).find(([name, value]) => !this._isCompleteMatch(name, value)) === undefined;
    }
    evalMustNotDisplaying(mustNotDisplaying) {
        // allow using prefix in task names
        const displaying = Object.keys(this._displaying);
        return mustNotDisplaying.find(prefix => displaying.find(key => key.startsWith(prefix))) === undefined;
    }
    save() {
        localStorage.setItem(this._key, JSON.stringify(this._values));
        this._notify.next();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.8", ngImport: i0, type: BdcWalkService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.0.8", ngImport: i0, type: BdcWalkService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.8", ngImport: i0, type: BdcWalkService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [] });
export var BdcDisplayEventAction;
(function (BdcDisplayEventAction) {
    BdcDisplayEventAction[BdcDisplayEventAction["VisibilityChanged"] = 0] = "VisibilityChanged";
    BdcDisplayEventAction[BdcDisplayEventAction["UserClosed"] = 1] = "UserClosed";
    BdcDisplayEventAction[BdcDisplayEventAction["ButtonClicked"] = 2] = "ButtonClicked";
})(BdcDisplayEventAction || (BdcDisplayEventAction = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmRjLXdhbGsuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2JkYy13YWxrdGhyb3VnaC9zcmMvbGliL2JkYy13YWxrLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMzQyxPQUFPLEVBQUMsZUFBZSxFQUFFLE9BQU8sRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUM5QyxPQUFPLEtBQUssQ0FBQyxNQUFNLFFBQVEsQ0FBQzs7QUFLNUIsTUFBTSxPQUFPLGNBQWM7SUFZekIsSUFBSSxRQUFRO1FBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFFRDtRQWZRLFlBQU8sR0FBRyxJQUFJLGVBQWUsQ0FBTyxJQUFJLENBQUMsQ0FBQztRQUMxQyxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBbUIsQ0FBQztRQUVuRCxnQkFBVyxHQUE0QixFQUFFLENBQUM7UUFDMUMsYUFBUSxHQUFHLENBQUMsQ0FBQztRQUNiLFNBQUksR0FBRyxnQkFBZ0IsQ0FBQztRQUN4QixjQUFTLEdBQUcsS0FBSyxDQUFDO1FBRTFCLFlBQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3RDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQU94RCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFakUsMkNBQTJDO1FBQzNDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUMxQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDZDtJQUNILENBQUM7SUFFRCxP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QUFBO0FBQ2YsQ0FBQyxFQUpXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJaEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIEJkY1dhbGtTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBfbm90aWZ5ID0gbmV3IEJlaGF2aW9yU3ViamVjdDx2b2lkPihudWxsKTtcbiAgcHJpdmF0ZSBfbm90aWZ5RGlzcGxheWluZyA9IG5ldyBTdWJqZWN0PEJkY0Rpc3BsYXlFdmVudD4oKTtcbiAgcHJpdmF0ZSBfdmFsdWVzOiBUYXNrTGlzdDtcbiAgcHJpdmF0ZSBfZGlzcGxheWluZzoge1tpZDogc3RyaW5nXTogYm9vbGVhbn0gPSB7fTtcbiAgcHJpdmF0ZSBfdmVyc2lvbiA9IDE7XG4gIHByaXZhdGUgX2tleSA9ICdiZGNXYWxrdGhyb3VnaCc7XG4gIHByaXZhdGUgX2Rpc2FibGVkID0gZmFsc2U7XG5cbiAgY2hhbmdlcyA9IHRoaXMuX25vdGlmeS5hc09ic2VydmFibGUoKTtcbiAgY2hhbmdlc0Rpc3BsYXlpbmcgPSB0aGlzLl9ub3RpZnlEaXNwbGF5aW5nLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIGdldCBkaXNhYmxlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzYWJsZWQ7XG4gIH1cblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl92YWx1ZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMuX2tleSkpIHx8IHt9O1xuXG4gICAgLy8gcmVzZXQgYWxsIHZhbHVlcyBpZiB2ZXJzaW9uIGlzIGRpZmZlcmVudFxuICAgIGlmICh0aGlzLl92YWx1ZXMudmVyc2lvbiAhPT0gdGhpcy5fdmVyc2lvbikge1xuICAgICAgdGhpcy5yZXNldCgpO1xuICAgIH1cbiAgfVxuXG4gIG1pZ3JhdGUobWlncmF0aW9uczogQmRjV2Fsa01pZ3JhdGlvbltdKSB7XG4gICAgY29uc3QgdmVyc2lvbiA9IHRoaXMuX3ZhbHVlcy5taWdyYXRpb25WZXJzaW9uIHx8IDA7XG5cbiAgICBtaWdyYXRpb25zLmZpbHRlcihtaWdyYXRpb24gPT4gbWlncmF0aW9uLnZlcnNpb24gPiB2ZXJzaW9uKS5mb3JFYWNoKG1pZ3JhdGlvbiA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhgUnVubmluZyBiZGMtbWlncmF0aW9uIHZlcnNpb24gJHttaWdyYXRpb24udmVyc2lvbn1gKTtcblxuICAgICAgbWlncmF0aW9uLm9wZXJhdGlvbnMuZm9yRWFjaChvcGVyYXRpb24gPT4ge1xuICAgICAgICBpZiAodGhpcy5ldmFsTXVzdENvbXBsZXRlZChvcGVyYXRpb24uY29uZGl0aW9uKSkge1xuICAgICAgICAgIE9iamVjdC5lbnRyaWVzKG9wZXJhdGlvbi50aGVuKS5mb3JFYWNoKChbaWQsIGRhdGFdKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICB0aGlzLl92YWx1ZXNbaWRdID0gZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl92YWx1ZXNbaWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fdmFsdWVzLm1pZ3JhdGlvblZlcnNpb24gPSBtaWdyYXRpb24udmVyc2lvbjtcbiAgICB9KTtcblxuICAgIHRoaXMuc2F2ZSgpO1xuICB9XG5cbiAgZ2V0SXNEaXNwbGF5aW5nKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzcGxheWluZ1tpZF0gfHwgZmFsc2U7XG4gIH1cblxuICBzZXRJc0Rpc3BsYXlpbmcoaWQ6IHN0cmluZywgdmlzaWJsZTogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLl9kaXNwbGF5aW5nW2lkXSAhPT0gdmlzaWJsZSkge1xuICAgICAgaWYgKHZpc2libGUpIHtcbiAgICAgICAgdGhpcy5fZGlzcGxheWluZ1tpZF0gPSB2aXNpYmxlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2Rpc3BsYXlpbmdbaWRdO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9ub3RpZnkubmV4dCgpO1xuICAgICAgdGhpcy5fbm90aWZ5RGlzcGxheWluZy5uZXh0KHtpZCwgdmlzaWJsZSwgYWN0aW9uOiBCZGNEaXNwbGF5RXZlbnRBY3Rpb24uVmlzaWJpbGl0eUNoYW5nZWR9KTtcbiAgICB9XG4gIH1cblxuICBsb2dVc2VyQWN0aW9uKGlkOiBzdHJpbmcsIGFjdGlvbjogQmRjRGlzcGxheUV2ZW50QWN0aW9uKSB7XG4gICAgdGhpcy5fbm90aWZ5RGlzcGxheWluZy5uZXh0KHtpZCwgdmlzaWJsZTogZmFsc2UsIGFjdGlvbn0pO1xuICB9XG5cbiAgZ2V0VGFza0NvbXBsZXRlZChpZDogc3RyaW5nKTogYW55IHwgYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlc1tpZF0gfHwgZmFsc2U7XG4gIH1cblxuICBzZXRUYXNrQ29tcGxldGVkKGlkOiBzdHJpbmcsIHZhbHVlOiBhbnkgfCBib29sZWFuID0gdHJ1ZSkge1xuICAgIGlmICh0aGlzLl92YWx1ZXNbaWRdICE9PSB2YWx1ZSAmJiB2YWx1ZSkge1xuICAgICAgdGhpcy5fdmFsdWVzW2lkXSA9IHZhbHVlO1xuICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl92YWx1ZXMuaGFzT3duUHJvcGVydHkoaWQpICYmICF2YWx1ZSkge1xuICAgICAgZGVsZXRlIHRoaXMuX3ZhbHVlc1tpZF07XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gIH1cblxuICBzZXRUYXNrcyh0YXNrczogVGFza0xpc3QpIHtcbiAgICBsZXQgY2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgT2JqZWN0LmVudHJpZXModGFza3MpLmZvckVhY2goKFtpZCwgZGF0YV0pID0+IHtcbiAgICAgIGlmICh0aGlzLl92YWx1ZXNbaWRdICE9PSBkYXRhICYmIGRhdGEpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVzW2lkXSA9IGRhdGE7XG4gICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl92YWx1ZXMuaGFzT3duUHJvcGVydHkoaWQpICYmICFkYXRhKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl92YWx1ZXNbaWRdO1xuICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gIH1cblxuICBnZXRUYXNrcygpIHtcbiAgICByZXR1cm4gey4uLnRoaXMuX3ZhbHVlc307XG4gIH1cblxuICByZXNldChwcmVmaXg/OiBzdHJpbmcpIHtcbiAgICBpZiAocHJlZml4KSB7XG4gICAgICAvLyByZW1vdmUgb25seSBrZXlzIHByZWZpeGVkIHdpdGggcGFyYW1cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3ZhbHVlcykuZmlsdGVyKGtleSA9PiBrZXkuc3RhcnRzV2l0aChwcmVmaXgpKS5mb3JFYWNoKGtleVRvUmVtb3ZlID0+IGRlbGV0ZSB0aGlzLl92YWx1ZXNba2V5VG9SZW1vdmVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcmVtb3ZlIGFsbCBrZXlzXG4gICAgICB0aGlzLl92YWx1ZXMgPSB7dmVyc2lvbjogdGhpcy5fdmVyc2lvbn07XG4gICAgfVxuXG4gICAgdGhpcy5zYXZlKCk7XG4gIH1cblxuICBkaXNhYmxlQWxsKGRpc2FibGVkID0gdHJ1ZSkge1xuICAgIHRoaXMuX2Rpc2FibGVkID0gZGlzYWJsZWQ7XG4gICAgdGhpcy5fbm90aWZ5Lm5leHQoKTtcbiAgfVxuXG4gIHByaXZhdGUgX2lzQ29tcGxldGVNYXRjaChuYW1lOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgICBjb25zdCBzcmMgPSB0aGlzLmdldFRhc2tDb21wbGV0ZWQobmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuX2lzRXF1YWwoc3JjLCB2YWx1ZSkgfHwgKHR5cGVvZih2YWx1ZSkgPT09ICdvYmplY3QnICYmIF8uaXNNYXRjaChzcmMsIHZhbHVlKSk7XG4gIH1cblxuICBwcml2YXRlIF9pc0VxdWFsKHNyYzogYW55LCB2YWx1ZTogYW55KSB7XG4gICAgaWYgKHNyYyA9PT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3JjICE9PSBmYWxzZSAmJiB2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgICAgLy8gd2UgY2FuIGNvbXBhcmUgdmFsdWUgb2YgdHJ1ZSB3aXRoIGFueSBzb3VyY2VcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mKHZhbHVlKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIHN1cHBvcnQgbm90ICghKSBsZXNzIHRoYW4gKDwpIG9yIGdyZWF0ZXIgdGhhbiAoPikgY29tcGFyaXNvbnNcbiAgICAgIGNvbnN0IG9wID0gdmFsdWVbMF07XG4gICAgICBjb25zdCBjb21wVmFsdWUgPSB2YWx1ZS5zdWJzdHIoMSk7XG5cbiAgICAgIGlmICgob3AgPT09ICchJyAmJiBjb21wVmFsdWUgIT0gc3JjKSB8fCAob3AgPT09ICc8JyAmJiBzcmMgPCBjb21wVmFsdWUpIHx8IChvcCA9PT0gJz4nICYmIHNyYyA+IGNvbXBWYWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZXZhbE11c3RDb21wbGV0ZWQobXVzdENvbXBsZXRlZDogVGFza0xpc3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMobXVzdENvbXBsZXRlZCkuZmluZCgoW25hbWUsIHZhbHVlXSkgPT4gIXRoaXMuX2lzQ29tcGxldGVNYXRjaChuYW1lLCB2YWx1ZSkpID09PSB1bmRlZmluZWQ7XG4gIH1cblxuICBldmFsTXVzdE5vdERpc3BsYXlpbmcobXVzdE5vdERpc3BsYXlpbmc6IHN0cmluZ1tdKSB7XG4gICAgLy8gYWxsb3cgdXNpbmcgcHJlZml4IGluIHRhc2sgbmFtZXNcbiAgICBjb25zdCBkaXNwbGF5aW5nID0gT2JqZWN0LmtleXModGhpcy5fZGlzcGxheWluZyk7XG4gICAgcmV0dXJuIG11c3ROb3REaXNwbGF5aW5nLmZpbmQocHJlZml4ID0+IGRpc3BsYXlpbmcuZmluZChrZXkgPT4ga2V5LnN0YXJ0c1dpdGgocHJlZml4KSkpID09PSB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIHNhdmUoKSB7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5fa2V5LCBKU09OLnN0cmluZ2lmeSh0aGlzLl92YWx1ZXMpKTtcbiAgICB0aGlzLl9ub3RpZnkubmV4dCgpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFza0xpc3QgeyBbdGFza05hbWU6IHN0cmluZ106IGFueSB8IGJvb2xlYW47IH1cblxuZXhwb3J0IGludGVyZmFjZSBCZGNXYWxrTWlncmF0aW9uIHtcbiAgdmVyc2lvbjogbnVtYmVyO1xuICBvcGVyYXRpb25zOiB7XG4gICAgY29uZGl0aW9uOiBUYXNrTGlzdCxcbiAgICB0aGVuOiBUYXNrTGlzdFxuICB9W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmRjRGlzcGxheUV2ZW50IHtcbiAgaWQ6IHN0cmluZztcbiAgdmlzaWJsZTogYm9vbGVhbjtcbiAgYWN0aW9uOiBCZGNEaXNwbGF5RXZlbnRBY3Rpb247XG59XG5cbmV4cG9ydCBlbnVtIEJkY0Rpc3BsYXlFdmVudEFjdGlvbiB7XG4gIFZpc2liaWxpdHlDaGFuZ2VkLFxuICBVc2VyQ2xvc2VkLFxuICBCdXR0b25DbGlja2VkXG59XG4iXX0=