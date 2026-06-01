import type { ActionConfig } from "../actions";
import type { DynamicWidgetComponent, DynamicWidgetRoot, WidgetJson } from "./types";
type ActionConfigInput = {
    type: ActionConfig["type"];
    payload?: WidgetJson;
    handler?: ActionConfig["handler"];
    loadingBehavior?: ActionConfig["loadingBehavior"];
    streaming?: ActionConfig["streaming"];
    [key: string]: WidgetJson | undefined;
};
type WidgetPropValue = WidgetJson | ActionConfigInput | DynamicWidgetComponent | DynamicWidgetComponent[] | undefined;
type WidgetProps = Record<string, WidgetPropValue>;
type Children = DynamicWidgetComponent[];
type SingleChild = DynamicWidgetComponent;
export type BasicProps = WidgetProps & {
    children?: Children;
};
export declare function Basic(props?: BasicProps): DynamicWidgetRoot;
export type CardProps = WidgetProps & {
    children: Children;
    asForm?: boolean;
    confirm?: WidgetJson;
    cancel?: WidgetJson;
};
export declare function Card(props: CardProps): DynamicWidgetRoot;
export type ListViewProps = WidgetProps & {
    children: DynamicWidgetComponent[];
};
export declare function ListView(props: ListViewProps): DynamicWidgetRoot;
export type ListViewItemProps = WidgetProps & {
    children: Children;
    onClickAction?: ActionConfigInput;
};
export declare function ListViewItem(props: ListViewItemProps): DynamicWidgetComponent;
export type TextProps = WidgetProps & {
    value: string;
    streaming?: boolean;
};
export type TextWidget = {
    type: "Text";
} & TextProps;
export declare function Text(props: TextProps): TextWidget;
export type MarkdownProps = WidgetProps & {
    value: string;
    streaming?: boolean;
};
export type MarkdownWidget = {
    type: "Markdown";
} & MarkdownProps;
export declare function Markdown(props: MarkdownProps): MarkdownWidget;
export type TitleProps = WidgetProps & {
    value: string;
};
export declare function Title(props: TitleProps): DynamicWidgetComponent;
export type CaptionProps = WidgetProps & {
    value: string;
};
export declare function Caption(props: CaptionProps): DynamicWidgetComponent;
export type BadgeProps = WidgetProps & {
    label: string;
};
export declare function Badge(props: BadgeProps): DynamicWidgetComponent;
export type BoxProps = WidgetProps & {
    children?: Children;
};
export declare function Box(props?: BoxProps): DynamicWidgetComponent;
export type RowProps = WidgetProps & {
    children?: Children;
};
export declare function Row(props?: RowProps): DynamicWidgetComponent;
export type ColProps = WidgetProps & {
    children?: Children;
};
export declare function Col(props?: ColProps): DynamicWidgetComponent;
export type FormProps = WidgetProps & {
    children?: Children;
    onSubmitAction?: ActionConfigInput;
};
export declare function Form(props?: FormProps): DynamicWidgetComponent;
export declare function Divider(props?: WidgetProps): DynamicWidgetComponent;
export type IconProps = WidgetProps & {
    name: string;
};
export declare function Icon(props: IconProps): DynamicWidgetComponent;
export type ImageProps = WidgetProps & {
    src: string;
    alt?: string;
};
export declare function Image(props: ImageProps): DynamicWidgetComponent;
export type ButtonProps = WidgetProps & {
    label?: string;
    onClickAction?: ActionConfigInput;
};
export declare function Button(props?: ButtonProps): DynamicWidgetComponent;
export declare function Spacer(props?: WidgetProps): DynamicWidgetComponent;
export type SelectProps = WidgetProps & {
    name: string;
    options: WidgetJson[];
};
export declare function Select(props: SelectProps): DynamicWidgetComponent;
export type DatePickerProps = WidgetProps & {
    name: string;
};
export declare function DatePicker(props: DatePickerProps): DynamicWidgetComponent;
export type CheckboxProps = WidgetProps & {
    name: string;
    label?: string;
};
export declare function Checkbox(props: CheckboxProps): DynamicWidgetComponent;
export type InputProps = WidgetProps & {
    name: string;
};
export declare function Input(props: InputProps): DynamicWidgetComponent;
export type LabelProps = WidgetProps & {
    value: string;
    fieldName: string;
};
export declare function Label(props: LabelProps): DynamicWidgetComponent;
export type RadioGroupProps = WidgetProps & {
    name: string;
    options?: WidgetJson[];
};
export declare function RadioGroup(props: RadioGroupProps): DynamicWidgetComponent;
export type TextareaProps = WidgetProps & {
    name: string;
};
export declare function Textarea(props: TextareaProps): DynamicWidgetComponent;
export type TransitionProps = WidgetProps & {
    children: SingleChild;
};
export declare function Transition(props: TransitionProps): DynamicWidgetComponent;
export type ChartProps = WidgetProps & {
    data: WidgetJson[];
    series: WidgetJson[];
    xAxis: string;
    showYAxis?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
    barGap?: string | number;
    barCategoryGap?: string | number;
    flex?: string | number;
};
export declare function Chart(props: ChartProps): DynamicWidgetComponent;
export {};
