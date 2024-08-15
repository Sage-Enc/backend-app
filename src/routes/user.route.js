import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getWatchHistory, loginUser, logoutUser, refreshingRToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser
);

upload.single()

router.route("/login").post(loginUser);

// Secured Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refreshingToken").post(refreshingRToken)
router.route("/changepassword").post(verifyJWT, changeCurrentPassword)
router.route("/getuser").get(verifyJWT, getCurrentUser)
router.route("/updateaccountdetails").patch(verifyJWT, updateAccountDetails)
router.route("/updateavatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/updatecoverimage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/getwatchhistory").get(verifyJWT, getWatchHistory);

export default router;