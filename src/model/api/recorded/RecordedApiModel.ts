import { inject, injectable } from 'inversify';
import * as apid from '../../../../api';
import IRecordedDB from '../../db/IRecordedDB';
import IIPCClient from '../../ipc/IIPCClient';
import IEncodeManageModel from '../../service/encode/IEncodeManageModel';
import IRecordedItemUtil from '../IRecordedItemUtil';
import IRecordedApiModel from './IRecordedApiModel';

@injectable()
export default class RecordedApiModel implements IRecordedApiModel {
    private ipc: IIPCClient;
    private recordedDB: IRecordedDB;
    private encodeManage: IEncodeManageModel;
    private recordedItemUtil: IRecordedItemUtil;

    constructor(
        @inject('IIPCClient') ipc: IIPCClient,
        @inject('IRecordedDB') recordedDB: IRecordedDB,
        @inject('IEncodeManageModel') encodeManage: IEncodeManageModel,
        @inject('IRecordedItemUtil') recordedItemUtil: IRecordedItemUtil,
    ) {
        this.recordedDB = recordedDB;
        this.ipc = ipc;
        this.encodeManage = encodeManage;
        this.recordedItemUtil = recordedItemUtil;
    }

    /**
     * 録画情報の取得
     * @param option: GetRecordedOption
     * @return Promise<apid.Records>
     */
    public async gets(option: apid.GetRecordedOption): Promise<apid.Records> {
        // tslint:disable-next-line: typedef
        const [records, total] = await this.recordedDB.findAll(option, {
            isNeedVideoFiles: true,
            isNeedThumbnails: true,
            isNeedTags: false,
        });

        const encodeIndex = this.encodeManage.getRecordedIndex();

        return {
            records: records.map(r => {
                return this.recordedItemUtil.convertRecordedToRecordedItem(r, option.isHalfWidth, encodeIndex);
            }),
            total,
        };
    }

    /**
     * 指定した recorded id の録画情報を取得する
     * @param recordedId: apid.RecordedId
     * @param isHalfWidth: boolean 半角文字で返すか
     * @return Promise<apid.RecordedItem | null> null の場合録画情報が存在しない
     */
    public async get(recordedId: apid.RecordedId, isHalfWidth: boolean): Promise<apid.RecordedItem | null> {
        const item = await this.recordedDB.findId(recordedId);

        const encodeIndex = this.encodeManage.getRecordedIndex();

        return item === null
            ? null
            : this.recordedItemUtil.convertRecordedToRecordedItem(item, isHalfWidth, encodeIndex);
    }

    /**
     *
     * @param recordedId: ReserveId
     * @return Promise<void>
     */
    public async delete(recordedId: apid.RecordedId): Promise<void> {
        await this.encodeManage.cancelEncodeByRecordedId(recordedId);

        return this.ipc.recorded.delete(recordedId);
    }

    /**
     * recordedId を指定してエンコードを停止させる
     * @param recordedId: apid.RecordedId
     * @return Promise<void>
     */
    public stopEncode(recordedId: apid.RecordedId): Promise<void> {
        return this.encodeManage.cancelEncodeByRecordedId(recordedId);
    }
}