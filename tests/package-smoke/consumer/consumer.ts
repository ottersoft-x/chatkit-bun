import { WidgetTemplate } from "chatkit-nodejs";

export async function loadConsumerRelativeTemplate(): Promise<WidgetTemplate> {
  return WidgetTemplate.fromFile("fixtures/relative.widget");
}
