import mongoose from 'mongoose';
export declare const Room: mongoose.Model<{
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    roomId: string;
    hostId: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=Room.d.ts.map