import { Directive, Input, TemplateRef, ViewContainerRef, inject, Renderer2, EmbeddedViewRef } from '@angular/core';
import { CapabilityService } from '../../core/services/capability.service';

@Directive({
  selector: '[appCan]',
  standalone: true
})
export class CanDirective {
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  private capabilityService = inject(CapabilityService);
  private renderer = inject(Renderer2);
  private hasView = false;
  private embeddedView: EmbeddedViewRef<any> | null = null;

  @Input() appCanMode: 'hide' | 'disable' = 'hide';

  @Input() set appCan(capabilities: string | string[]) {
    const caps = Array.isArray(capabilities) ? capabilities : [capabilities];
    const canAccess = this.capabilityService.canAny(caps);

    if (canAccess) {
      if (!this.hasView) {
        this.embeddedView = this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      }
      this.toggleDisable(false);
    } else {
      if (this.appCanMode === 'hide') {
        this.viewContainer.clear();
        this.hasView = false;
        this.embeddedView = null;
      } else if (this.appCanMode === 'disable') {
        if (!this.hasView) {
          this.embeddedView = this.viewContainer.createEmbeddedView(this.templateRef);
          this.hasView = true;
        }
        this.toggleDisable(true);
      }
    }
  }

  private toggleDisable(disable: boolean) {
    if (!this.embeddedView) return;
    const rootNodes = this.embeddedView.rootNodes;
    rootNodes.forEach(node => {
      if (node.nodeType === 1) { // ELEMENT_NODE
        if (disable) {
          this.renderer.setAttribute(node, 'disabled', 'true');
          this.renderer.setStyle(node, 'opacity', '0.5');
          this.renderer.setStyle(node, 'pointer-events', 'none');
        } else {
          this.renderer.removeAttribute(node, 'disabled');
          this.renderer.removeStyle(node, 'opacity');
          this.renderer.removeStyle(node, 'pointer-events');
        }
      }
    });
  }
}
